var assign = require('lodash/object/assign'),
    mapValues = require('lodash/object/mapValues'),
    isString = require('lodash/lang/isString'),
    marked = require('marked');

function Generator(druck) {

  var CONTENT_START_TAG = '<~~page-content>';
  var CONTENT_END_TAG   = '</~~page-content>';

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

    var rendered = page.body;
    var contentNeedsProcessing = druck.isMarkdown(page);

    // (1.0) mark content-area if content processing is requested
    if (contentNeedsProcessing) {
      rendered = CONTENT_START_TAG + rendered + CONTENT_END_TAG;
    }

    // (1.1) wrap with item_body block to allow inclusion
    // into parent template
    rendered =
      '{% block item_body %}\n' +
      rendered + '\n' +
      '{% endblock %}\n';

    // (1.2) extend layout if necessary
    if (layout && page.layout) {
      rendered =
        '{% extends "' + withExtension(page.layout, 'html') + '" %}\n' +
        rendered;
    }

    // (1.3) render nunjucks template
    rendered = nunjucks.renderString(rendered, locals);

    // (1.4) handle content post-processing
    if (contentNeedsProcessing) {

      // (1.4.1) extract page content
      var renderedParts = rendered.split(new RegExp('(' + escapeRegExp(CONTENT_START_TAG) + '|' + escapeRegExp(CONTENT_END_TAG) + ')'));
      if (renderedParts.length !== 5) {
        throw new Error('The tags [' + CONTENT_START_TAG + ', ' + CONTENT_END_TAG + '] may not be used in template or page files.');
      }
      var content = renderedParts[2];

      // (1.4.2) render page content
      content = marked(content);

      // (1.4.3) plug rendered content back in
      rendered = renderedParts[0] + content + renderedParts[4];
    }

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
 * Escape a string for use as regex. Should not be used on escaped strings.
 *
 * @param {String} string to escape
 *
 * @return {String} escaped string
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
