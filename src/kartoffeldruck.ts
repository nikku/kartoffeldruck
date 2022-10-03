import {
  isArray,
  isString,
  isFunction,
  assign,
  merge,
  filter,
  forEach
} from 'min-dash';

import mkdirp from 'mkdirp';

import { EventEmitter } from 'node:events';

import Nunjucks from '@nikku/nunjucks';

import { marked } from 'marked';
import picomatch from 'picomatch';

import { Logger, NopLogger } from './logger';

import Page from './page';

import frontMatter from 'front-matter';

import fs from 'node:fs';
import path from 'node:path';

import { createFiles, Files } from './files';
import { createGenerator, Generator } from './generator';

import { yellow as colorYellow } from 'kleur/colors';

import AggregateError from 'aggregate-error';

import {
  Locals,
  GenerateOptions,
  GeneratedPage
} from './types';

type KartoffeldruckOptions = Partial<{
  source: string;
  dest: string;
  templates: string;
  cwd: string;
  nunjucks: any;
  contentProcessors: false | { [pattern: string]: any };
  locals: Locals;
}>;

type KartoffeldruckConfig = Partial<{
  logger: Logger;
  files: Files;
  generator: Generator;
}> & KartoffeldruckOptions;

const defaultLocations = {
  source: 'pages',
  dest: 'dist',
  templates: 'templates',
  assets: 'assets'
};

const runnerFile = 'kartoffeldruck.js';


/**
 * The Kartoffeldruck static side generator.
 */
export class Kartoffeldruck extends EventEmitter {

  logger: Logger;
  files: Files;
  generator: Generator;
  config: KartoffeldruckOptions;

  constructor(config: KartoffeldruckConfig = {}) {

    super();

    this.logger = config.logger || new NopLogger();

    this.files = config.files || createFiles(this);
    this.generator = config.generator || createGenerator(this);

    this.init(config);
  }

  getNunjucks() {
    const config = this.config;

    let nunjucks = config.nunjucks;

    // cache nunjucks in generator
    if (!nunjucks) {
      nunjucks = config.nunjucks = Nunjucks.configure(config.templates, { autoescape: false });
    }

    return nunjucks;
  }

  getContentProcessors(page: Page) {
    const config = this.config;

    function markdownProcessor(content, _page) {
      return marked(content);
    }

    let contentProcessors = config.contentProcessors;

    // content processors disabled
    if (contentProcessors === false) {
      return [];
    }

    // content processors provided via factory fn
    //
    // contentProcessors=function(page) {
    //   return fn || [
    //     fn1,
    //     fn2,
    //     ...
    //   ];
    // }
    if (isFunction(contentProcessors)) {
      contentProcessors = contentProcessors(page);

      if (!contentProcessors) {
        return [];
      }

      if (isFunction(contentProcessors)) {
        return [ contentProcessors ];
      }

      if (isArray(contentProcessors)) {
        return contentProcessors;
      }

      throw new Error(
        'invalid config.contentProcessors return value. ' +
        'Expected fn|Array<fn>, got ' + contentProcessors
      );
    }

    // if not explicitly turned off, do markdown
    // processing per default
    if (typeof contentProcessors === 'undefined') {
      contentProcessors = { '*.md': markdownProcessor };
    }

    // content processors is a pattern to processor map
    //
    // contentProcessors={
    //   '*.md': function(content, page) { ... }
    //   '*.other': ...
    // }
    if (typeof contentProcessors === 'object') {

      // filter processors suitable for the current page
      return filter(contentProcessors, function(processor, glob) {
        return picomatch(glob, { nocase: true, matchBase: true })(page.id);
      });
    }

    throw new Error('invalid contentProcessors config; expected object|fn|false');
  }

  /**
   * Initialize the Kartoffeldruck instance with the given configuration.
   *
   * @param { KartoffeldruckOptions } config
   */
  init(config: KartoffeldruckOptions) {
    this.configure(config);
  }

  /**
   * Re-configure the Kartoffeldruck instance with the given configuration.
   *
   * @param { KartoffeldruckOptions } config
   */
  configure(config: KartoffeldruckOptions) {

    const currentConfig = this.config || {};

    const cwd = config.cwd || currentConfig.cwd || process.cwd();

    // resolve locations relative to CWD
    forEach(defaultLocations, function(val, key) {
      if (config[key]) {
        config[key] = cwd + '/' + config[key];
      } else {
        config[key] = currentConfig[key] || cwd + '/' + val;
      }
    });

    this.config = merge(currentConfig, { cwd: cwd }, config);
  }


  /**
   * Generate a page and return the generated results.
   */
  async generate(options: GenerateOptions) : Promise<GeneratedPage> {

    let source = options.source;

    if (isString(source)) {

      // a globbing pattern
      if (source.match(/\*/)) {
        source = await this.files(source);
      } else {
        source = await this.files.get(source);

        if (!source) {
          throw new Error('file not found: ' + options.source);
        }
      }
    }

    const generateEach = (sources, options) => {
      return Promise.all(
        sources.map((source) => {
          return this.generate(assign({ }, options, {
            source,
            dest: this.expandUri(options.dest, source, options.locals)
          }));
        })
      );
    };

    const paginate = (source: Page, options: GenerateOptions) => {

      const locals = options.locals,
            items = locals.items,
            pageSize = options.paginate,
            totalPages = Math.ceil(items.length / pageSize);

      if (!items) {
        throw new Error('must specify locals: { items } with pagination');
      }

      const generatePage = (idx: number) => {

        const paged = items.slice(pageSize * idx, pageSize * idx + pageSize);

        const {
          paginate: _paginate,
          ...pagedOptions
        } = assign({ }, options, {
          source,
          dest: this.expandUri(options.dest, source, locals, idx),
          locals: assign({}, locals, {
            items: paged,
            allItems: items,
            page: {
              idx: idx,
              totalPages,
              previousRef: (idx > 0 ? this.expandUri(options.dest, source, locals, idx - 1).replace(/\/?index\.html$/, '') : null),
              nextRef: (idx + 1 < totalPages ? this.expandUri(options.dest, source, locals, idx + 1).replace(/\/?index\.html$/, '') : null),
              firstRef: this.expandUri(options.dest, source, locals, 0).replace(/\/?index\.html$/, ''),
              lastRef: this.expandUri(options.dest, source, locals, totalPages - 1).replace(/\/?index\.html$/, '')
            }
          })
        });

        return this.generate(pagedOptions);
      };

      // always generate at least the first page,
      // independent of whether items have been provided
      const pages = range(Math.max(1, totalPages));

      // generate pages in range
      return Promise.all(pages.map(generatePage));
    };

    // generate multiple pages
    if (isArray(source)) {
      return generateEach(source, options);
    }

    // paginate single page
    if (options.paginate) {
      return paginate(source, options);
    }

    // basic generate

    const locals = assign({}, this.config.locals, options.locals);
    const dest = this.expandUri(options.dest, source, locals);

    const pageOptions = assign({}, options, {
      source,
      dest,
      locals
    });

    const rendered = await this.generator.generate(pageOptions);

    const generatedResults = assign({}, pageOptions, { rendered: rendered });

    this.emit('generated', generatedResults);

    return generatedResults;
  }

  expandUri(pattern: string, source: Page, locals: Locals, page?: number) {

    if (isString(source)) {
      throw new Error('source must be an object');
    }

    // early return on already expanded
    if (!/:([\w]+)(\/?)/.test(pattern)) {
      return pattern;
    }

    const replacements = assign({}, source, locals, page !== undefined ? { page: page + 1 } : {});

    return pattern.replace(/:([\w]+)(\/?)/g, function(match, key, slash) {

      const replacement = replacements[key];

      if (key === 'page' && replacement === 1) {
        return '';
      } else {
        return replacement + slash;
      }
    });
  }

  /**
   * Load a source file via id.
   */
  async loadFile(id: string) : Promise<Page> {
    const cwd = this.config.source;

    let data;

    try {
      data = fs.readFileSync(path.join(cwd, id), 'utf8');
    } catch (e) {
      return null;
    }

    const {
      attributes,
      body
    } = frontMatter(data);

    return new Page(id, id.replace(/\.[^.]+$/, ''), attributes, body);
  }

  /**
   * @internal
   */
  async ensureDirExists(filePath) {
    const dirname = path.dirname(filePath);
    await mkdirp(dirname);
  }

  /**
   * @internal
   */
  async writeFile(dest: string, contents: string) {
    const fullPath = path.join(this.config.dest, dest);

    await this.ensureDirExists(fullPath);

    this.logger.debug('created %s', path.relative(this.config.cwd, fullPath));

    fs.writeFileSync(fullPath, contents, 'utf8');
  }

  /**
   * Run kartoffeldruck with the given options.
   */
  static async run(options: { cwd?: string, logger?: Logger }) {

    options = options || {};

    const cwd = options.cwd || process.cwd(),
          logger = options.logger || new NopLogger();

    logger.info('initializing kartoffeldruck in %s', cwd);

    const time = Date.now();
    const druck = new Kartoffeldruck({
      cwd,
      logger
    });

    const runnerPath = path.resolve(cwd + '/' + runnerFile);

    let runner;

    try {
      runner = require(runnerPath);
    } catch (err) {
      throw new AggregateError([
        `failed to load <${runnerPath}>`,
        err
      ]);
    }

    try {
      await runner(druck);
    } catch (err) {
      throw new AggregateError([
        `failed to execute <${runnerPath}>`,
        err
      ]);
    }

    logger.info('done in ' + colorYellow((Date.now() - time) + 'ms'));

    return druck;
  }

}


// helpers /////////////

function range(size) {
  return [ ...Array(size).keys() ];
}