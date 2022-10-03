const {
  isArray,
  isString,
  isFunction,
  assign,
  merge,
  filter,
  forEach
} = require('min-dash');

const AggregateError = require('aggregate-error');

const mkdirp = require('mkdirp');

const { EventEmitter } = require('events');

const Nunjucks = require('@nikku/nunjucks');

const { marked } = require('marked'),
      minimatch = require('minimatch');

const colors = require('colors/safe');

const NopLogger = require('./nop-logger');

const Page = require('./page');

const frontMatter = require('front-matter'),
      fs = require('fs'),
      path = require('path');

const Files = require('./files'),
      Generator = require('./generator');

const runnerFile = 'kartoffeldruck.js';

const defaultLocations = {
  source: 'pages',
  dest: 'dist',
  templates: 'templates',
  assets: 'assets'
};


function Kartoffeldruck(config) {
  EventEmitter.call(this);

  config = config || {};

  this.logger = config.logger || new NopLogger();

  this.files = config.files || new Files(this);
  this.generator = config.generator || new Generator(this);

  this.init(config);
}

Kartoffeldruck.prototype = Object.create(EventEmitter.prototype);

Kartoffeldruck.prototype.getNunjucks = function() {
  const config = this.config;

  let nunjucks = config.nunjucks;

  // cache nunjucks in generator
  if (!nunjucks) {
    nunjucks = config.nunjucks = Nunjucks.configure(config.templates, { autoescape: false });
  }

  return nunjucks;
};

Kartoffeldruck.prototype.getContentProcessors = function(page) {
  const config = this.config;

  function markdownProcessor(content, page) {
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
      return minimatch(page.id, glob, { nocase: true, matchBase: true });
    });
  }

  throw new Error('invalid contentProcessors config; expected object|fn|false');
};

Kartoffeldruck.prototype.init =
Kartoffeldruck.prototype.configure = function(config) {

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
};


/**
 * Generate a page and return the generated results.
 *
 * @param {Object} options
 *
 * @return {Promise<Array<Object>>} generated files
 */
Kartoffeldruck.prototype.generate = async function(options) {

  const self = this;

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

  function generateEach(sources, options) {
    return Promise.all(
      sources.map(function(source) {
        return self.generate(assign({ }, options, {
          source,
          dest: self.expandUri(options.dest, source, options.locals)
        }));
      })
    );
  }

  function paginate(source, options) {

    const locals = options.locals,
          items = locals.items,
          pageSize = options.paginate,
          totalPages = Math.ceil(items.length / pageSize);

    if (!items) {
      throw new Error('must specify locals: { items } with pagination');
    }

    function generatePage(idx) {

      const paged = items.slice(pageSize * idx, pageSize * idx + pageSize);

      const {
        paginate,
        ...pagedOptions
      } = assign({ }, options, {
        source,
        dest: self.expandUri(options.dest, source, locals, idx),
        locals: assign({}, locals, {
          items: paged,
          allItems: items,
          page: {
            idx: idx,
            totalPages,
            previousRef: (idx > 0 ? self.expandUri(options.dest, source, locals, idx - 1).replace(/\/?index\.html$/, '') : null),
            nextRef: (idx + 1 < totalPages ? self.expandUri(options.dest, source, locals, idx + 1).replace(/\/?index\.html$/, '') : null),
            firstRef: self.expandUri(options.dest, source, locals, 0).replace(/\/?index\.html$/, ''),
            lastRef: self.expandUri(options.dest, source, locals, totalPages - 1).replace(/\/?index\.html$/, '')
          }
        })
      });

      return self.generate(pagedOptions);
    }

    // always generate at least the first page,
    // independent of whether items have been provided
    const pages = range(Math.max(1, totalPages));

    // generate pages in range
    return Promise.all(pages.map(generatePage));
  }

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
};

Kartoffeldruck.prototype.expandUri = function(pattern, source, locals, page) {

  if (isString(source)) {
    throw new Error('source must be an object');
  }

  const replacements = assign({}, source, locals, page !== undefined ? { page: page + 1 } : {});

  if (pattern.expanded) {
    return pattern;
  }

  const expanded = pattern.replace(/:([\w]+)(\/?)/g, function(match, key, slash) {

    const replacement = replacements[key];

    if (key === 'page' && replacement === 1) {
      return '';
    } else {
      return replacement + slash;
    }
  });

  expanded.expanded = true;

  return expanded;
};

/**
 * @param {string} id
 *
 * @return {Promise<Page>}
 */
Kartoffeldruck.prototype.loadFile = async function(id) {
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
};

Kartoffeldruck.prototype.ensureDirExists = async function(filePath) {
  var dirname = path.dirname(filePath);
  await mkdirp(dirname);
};

Kartoffeldruck.prototype.writeFile = async function(dest, contents) {
  var fullPath = path.join(this.config.dest, dest);

  await this.ensureDirExists(fullPath);

  this.logger.debug('created %s', path.relative(this.config.cwd, fullPath));

  fs.writeFileSync(fullPath, contents, 'utf8');
};


/**
 * Run druck with the given options.
 *
 * @param {Object} options
 *
 * @return {Promise<Kartoffeldruck>} druck instance
 */
Kartoffeldruck.run = async function(options) {

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

  logger.info('done in ' + colors.yellow((Date.now() - time) + 'ms'));

  return druck;
};

module.exports = Kartoffeldruck;


// helpers /////////////

function range(size) {
  return [ ...Array(size).keys() ];
}