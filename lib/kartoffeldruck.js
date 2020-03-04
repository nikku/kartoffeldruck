var {
  isArray,
  isString,
  isFunction,
  assign,
  merge,
  filter,
  forEach
} = require('min-dash');

var mkdirp = require('mkdirp');

var { EventEmitter } = require('events');

var Nunjucks = require('@nikku/nunjucks');

var marked = require('marked'),
    minimatch = require('minimatch');

var colors = require('colors/safe');

var NopLogger = require('./nop-logger');

var Page = require('./page');

var frontMatter = require('front-matter'),
    fs = require('fs'),
    path = require('path');

var Files = require('./files'),
    Generator = require('./generator');

var runnerFile = 'kartoffeldruck.js';

var defaultLocations = {
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
  var config = this.config;

  var nunjucks = config.nunjucks;

  // cache nunjucks in generator
  if (!nunjucks) {
    nunjucks = config.nunjucks = Nunjucks.configure(config.templates, { autoescape: false });
  }

  return nunjucks;
};

Kartoffeldruck.prototype.getContentProcessors = function(page) {
  var config = this.config;

  function markdownProcessor(content, page) {
    return marked(content);
  }

  var contentProcessors = config.contentProcessors;

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

  var currentConfig = this.config || {};

  var cwd = config.cwd || currentConfig.cwd || process.cwd();

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
 * @return {Array<Object>} generated files
 */
Kartoffeldruck.prototype.generate = function(options) {

  var self = this;

  var source = options.source;

  if (isString(source)) {
    // a globbing pattern
    if (source.match(/\*/)) {
      source = this.files(source);
    } else {
      source = this.files.get(source);

      if (!source) {
        throw new Error('file not found: ' + options.source);
      }
    }
  }

  function generateEach(sources, options) {
    return sources.map(function(source) {
      return self.generate(assign({ }, options, {
        source: source,
        dest: self.expandUri(options.dest, source, options.locals)
      }));
    });
  }

  function paginate(source, options) {

    var locals = options.locals,
        items = locals.items,
        pageSize = options.paginate,
        totalPages = Math.ceil(items.length / pageSize);

    if (!items) {
      throw new Error('must specify locals: { items } with pagination');
    }

    function generatePage(idx) {

      var paged,
          pagedOptions;

      paged = items.slice(pageSize * idx, pageSize * idx + pageSize);

      pagedOptions = assign({ }, options, {
        source: source,
        dest: self.expandUri(options.dest, source, locals, idx),
        locals: assign({}, locals, {
          items: paged,
          allItems: items,
          page: {
            idx: idx,
            totalPages: totalPages,
            previousRef: (idx > 0 ? self.expandUri(options.dest, source, locals, idx - 1).replace(/\/?index\.html$/, '') : null),
            nextRef: (idx + 1 < totalPages ? self.expandUri(options.dest, source, locals, idx + 1).replace(/\/?index\.html$/, '') : null),
            firstRef: self.expandUri(options.dest, source, locals, 0).replace(/\/?index\.html$/, ''),
            lastRef: self.expandUri(options.dest, source, locals, totalPages - 1).replace(/\/?index\.html$/, '')
          }
        })
      });

      delete pagedOptions.paginate;

      return self.generate(pagedOptions);
    }

    // always generate at least the first page,
    // independent of whether items have been provided
    var pages = range(Math.max(1, totalPages));

    // generate pages in range
    return pages.map(generatePage);
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

  var locals = assign({}, this.config.locals, options.locals);
  var dest = this.expandUri(options.dest, source, locals);

  var pageOptions = assign({}, options, {
    source: source,
    dest: dest,
    locals: locals
  });

  var rendered = this.generator.generate(pageOptions);

  var generatedResults = assign({}, pageOptions, { rendered: rendered });

  this.emit('generated', generatedResults);

  return generatedResults;
};

Kartoffeldruck.prototype.expandUri = function(pattern, source, locals, page) {

  if (isString(source)) {
    throw new Error('source must be an object');
  }

  var replacements = assign({}, source, locals, page !== undefined ? { page: page + 1} : {});

  if (pattern.expanded) {
    return pattern;
  }

  var expanded = pattern.replace(/:([\w]+)(\/?)/g, function(match, key, slash) {

    var replacement = replacements[key];

    if (key === 'page' && replacement === 1) {
      return '';
    } else {
      return replacement + slash;
    }
  });

  expanded.expanded = true;

  return expanded;
};

Kartoffeldruck.prototype.loadFile = function(id) {
  var cwd = this.config.source,
      data, fm, attributes, body;

  try {
    data = fs.readFileSync(path.join(cwd, id), 'utf8');
  } catch (e) {
    return null;
  }

  fm = frontMatter(data);
  attributes = fm.attributes;
  body = fm.body;

  return new Page(id, id.replace(/\.[^.]+$/, ''), attributes, body);
};

Kartoffeldruck.prototype.ensureDirExists = function(filePath) {
  var dirname = path.dirname(filePath);
  mkdirp.sync(dirname);
};

Kartoffeldruck.prototype.writeFile = function(dest, contents) {
  var fullPath = path.join(this.config.dest, dest);

  this.ensureDirExists(fullPath);

  this.logger.info('created %s', path.relative(this.config.cwd, fullPath));

  fs.writeFileSync(fullPath, contents, 'utf8');
};


/**
 * Run druck with the given options.
 *
 * @param {Object} options
 *
 * @return {Kartoffeldruck} druck instance
 */
Kartoffeldruck.run = function(options) {

  options = options || {};

  var cwd = options.cwd || process.cwd(),
      logger = options.logger || new NopLogger();

  logger.log('initializing kartoffeldruck in %s', cwd);

  var time = Date.now();
  var druck = new Kartoffeldruck({ cwd: cwd, logger: logger });

  var runner;

  try {
    runner = require(path.resolve(cwd + '/' + runnerFile));
  } catch (e) {
    logger.error(colors.red('failed to parse ' + runnerFile + ' runner: \n'), e);

    throw new Error('failed to parse ' + runnerFile + ' runner in ' + cwd);
  }

  runner(druck);

  logger.log('done in ' + colors.yellow((Date.now() - time) + 'ms'));

  return druck;
};

module.exports = Kartoffeldruck;


// helpers /////////////

function range(size) {
  return [...Array(size).keys()];
}