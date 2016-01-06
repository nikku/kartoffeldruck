var assign = require('lodash/object/assign'),
    mapValues = require('lodash/object/mapValues'),
    isString = require('lodash/lang/isString'),
    marked = require('marked');

function Generator(druck) {

  /**
   * Get all includes for the given page.
   *
   * @param {Object} page
   *
   * @return {Array<String>} include paths
   */
  function getIncludePaths(page) {
    var globalIncludes = druck.config.includes || [];

    return globalIncludes.concat(getPageIncludePaths(page));
  }

  /**
   * Get includes template.
   *
   * @param {Object} page
   *
   * @return {String} includes template
   */
  function getIncludes(page) {
    return getIncludePaths(page).map(function(path) {
      return '{% include "' + withExtension(path, 'html') + '" %}\n';
    }).join('');
  }

  function render(page, locals, layout) {

    var nunjucks = druck.getNunjucks();

    // (0) ensure we replace template parameters
    // in locals
    locals = mapValues(locals, function(val, key) {
      if (isString(val) && key !== 'body' && val.match(/\{\{.*\}\}/)) {
        return nunjucks.renderString(val, locals);
      } else {
        return val;
      }
    });

    var includesTemplate = getIncludes(page);

    var rendered = page.body;

    if (druck.isMarkdown(page)) {

      // (1.0) process nunjucks templates and variables in
      // markdown file, taking macros into account
      rendered = nunjucks.renderString(includesTemplate + rendered, locals);

      // (1.1) process markdown
      rendered = marked(rendered);

      // 1.2 wrap with item_body block to allow inclusion
      // into parent template
      rendered =
        '{% block item_body %}\n' +
        rendered + '\n' +
        '{% endblock %}\n';
    }

    if (layout && page.layout) {
      // (2.0) handle page as if layout is needed
      rendered =
        '{% extends "' + withExtension(page.layout, 'html') + '" %}\n' +
        includesTemplate +
        rendered;
    }

    rendered = nunjucks.renderString(rendered, locals);

    return rendered;
  }

  function generate(options) {

    var source = options.source,
        dest = options.dest,
        locals = assign({}, source, options.locals, helpers(options));

    var rendered = render(source, locals, true);
    druck.writeFile(dest, rendered);
  }

  /**
   * blog helpers
   */
  function helpers(options) {

    var dest = options.dest;

    var pathSeparator = dest.split('/').map(function() { return ''; }).join('../');

    var self = {

      render: function(page) {
        var locals = assign({}, self, page);
        return render(page, locals);
      },

      relative: function(path) {
        return pathSeparator + path;
      },

      assets: pathSeparator + 'assets'
    };

    return self;
  }

  /**
   * Generates a given blog configuration
   *
   * @param {Object} options
   */
  this.generate = generate;
}

module.exports = Generator;


/////// utilities //////////////////////////////////////////

/**
 * Extract includes from a page.
 *
 * @param {Object} page
 *
 * @return {Array<String>} includes to use
 */
function getPageIncludePaths(page) {

  var include = page.include;

  if (!include) {
    return [];
  }

  if (isString(include)) {
    include = [ include ];
  }

  return include;
}

/**
 * Return the file name with an extension,
 * setting the given one if it does not already
 * have one.
 *
 * @param {String} fileName
 * @param {String} defaultExtension
 *
 * @return {String}
 */
function withExtension(fileName, defaultExtension) {

  if (fileName.indexOf('.') !== -1) {
    return fileName;
  } else {
    return fileName + '.' + defaultExtension;
  }
}