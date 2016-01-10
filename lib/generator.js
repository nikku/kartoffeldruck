var assign = require('lodash/object/assign'),
    mapValues = require('lodash/object/mapValues'),
    isString = require('lodash/lang/isString'),
    marked = require('marked');

var MARKDOWN_MARKER = '<~~markdown~marker~~>';


function Generator(druck) {

  function renderNunjucks(template, locals, path) {
    return druck.getNunjucks().renderString(template, locals, { path: path });
  }

  function markMarkdown(template) {
    return MARKDOWN_MARKER + template + MARKDOWN_MARKER;
  }

  function renderMarkdown(template) {

    var split = template.split(MARKDOWN_MARKER);

    if (split.length !== 3) {
      throw new Error('must not use markdown marker (' + MARKDOWN_MARKER + ') in template or page');
    }

    return split[0] + marked(split[1]) + split[2];
  }

  function render(page, locals, layout) {

    // (0) ensure we replace template parameters in locals
    locals = mapValues(locals, function(val, key) {
      if (isString(val) && key !== 'body' && /\{\{.*\}\}/.test(val)) {
        return renderNunjucks(val, locals, page.id);
      } else {
        return val;
      }
    });

    var rendered = page.body;

    var isMarkdown = druck.isMarkdown(page);

    // (1.0) mark content-area if content processing is requested
    if (isMarkdown) {
      rendered = markMarkdown(rendered);
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
    rendered = renderNunjucks(rendered, locals, page.id);

    // (1.4) perform optional markdown post-processing
    if (isMarkdown) {
      rendered = renderMarkdown(rendered);
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

      render: function(page, layout) {

        if (layout) {
          page = assign({}, page, { layout: layout });
        }

        locals = assign({}, self, page);

        return render(page, locals, !!layout);
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
