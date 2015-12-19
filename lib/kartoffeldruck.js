var isArray = require('lodash/lang/isArray'),
    isString = require('lodash/lang/isString'),
    assign = require('lodash/object/assign'),
    del = require('del'),
    mkdirp = require('mkdirp'),
    EventEmitter = require('events').EventEmitter;

var colors = require('colors/safe');

var NopLogger = require('./nop-logger');

var Page = require('./page');

var frontMatter = require('front-matter'),
    fs = require('fs'),
    path = require('path');

var Files = require('./files'),
    Generator = require('./generator');

var runnerFile = 'kartoffeldruck.js';

var defaultActions = {
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

Kartoffeldruck.prototype.init = function(config) {

  var currentConfig = this.config;

  var cwd = (config.cwd) || (currentConfig && currentConfig.cwd) || process.cwd();

  function relativize(entry) {
    return cwd + '/' + (config[entry] || defaultActions[entry]);
  }

  this.config = {
    cwd: cwd,
    locals: assign({}, currentConfig && currentConfig.locals, config.locals),
    source: relativize('source'),
    dest: relativize('dest'),
    templates: relativize('templates'),
    assets: relativize('assets')
  };

  this.emit('init', this.config);
};


Kartoffeldruck.prototype.clean = function() {
  this.logger.info('cleaning %s', this.config.dest);

  del.sync(this.config.dest);
};


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
    sources.forEach(function(source) {
      self.generate(assign({ }, options, {
        source: source,
        dest: self.expandUri(options.dest, source, options.locals)
      }));
    });
  }

  function paginate(source, options) {

    var currentPage,
        locals = options.locals,
        items = locals.items,
        pageSize = options.paginate,
        totalPages = items.length / pageSize;

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
          page: {
            idx: idx,
            totalPages: totalPages,
            previousRef: (idx > 0 ? self.expandUri(options.dest, source, locals, idx - 1).replace(/\/?index\.html$/, '') : null),
            nextRef: (idx + 1 < totalPages ? self.expandUri(options.dest, source, locals, idx + 1).replace(/\/?index\.html$/, '') : null)
          }
        })
      });

      delete pagedOptions.paginate;

      self.generate(pagedOptions);
    }

    // always generate at least the first page,
    // independent of whether items have been provided
    generatePage(0);

    // generate all subsequent pages, if needed
    for (currentPage = 1; currentPage < totalPages; currentPage++) {
      generatePage(currentPage);
    }
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

  this.generator.generate(assign({ }, options, {
    source: source,
    dest: this.expandUri(options.dest, source, locals),
    locals: locals
  }));
};

Kartoffeldruck.prototype.expandUri = function(pattern, source, locals, page) {

  if (isString(source)) {
    throw new Error('source must be an object');
  }

  var replacements = assign({}, source, locals, page !== undefined ? { page: page + 1} : {});

  if (pattern.expanded) {
    return pattern;
  }

  var expanded = pattern.replace(/\:([\w]+)(\/?)/g, function(match, key, slash) {

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
      data, fm, body;

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

Kartoffeldruck.prototype.isMarkdown = function(page) {
  return page.id.match(/\.md$/);
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


Kartoffeldruck.run = function(options) {

  options = options || {};

  var cwd = options.cwd || process.cwd(),
      logger = options.logger || new NopLogger();

  var t = function() {
    return new Date().getTime();
  };

  logger.log('initializing kartoffeldruck in %s', cwd);

  var time = t();
  var blg = new Kartoffeldruck({ cwd: cwd, logger: logger });

  var runner;

  try {
    runner = require(path.resolve(cwd + '/' + runnerFile));
  } catch (e) {
    logger.error(colors.red('failed to parse ' + runnerFile + ' runner: \n'), e);

    throw new Error('failed to parse ' + runnerFile + ' runner in ' + cwd);
  }

  runner(blg);

  logger.log('done in ' + colors.yellow((t() - time) + 'ms'));
};

module.exports = Kartoffeldruck;