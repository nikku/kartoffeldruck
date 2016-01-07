var assign = require('lodash/object/assign'),
    mapValues = require('lodash/object/mapValues'),
    isString = require('lodash/lang/isString'),
    reduce = require('lodash/collection/reduce');

var CONTENT_MARKER = '<~~content~marker~~>';


function Generator(druck) {

  function renderNunjucks(template, locals, path) {
    return druck.getNunjucks().renderString(template, locals, { path: path });
  }

  function markContent(template) {
    return CONTENT_MARKER + template + CONTENT_MARKER;
  }

  function processContent(content, page, contentProcessors) {
    var processed = reduce(contentProcessors, function(content, contentProcessor) {
      return contentProcessor(content, page);
    }, content);

    return processed;
  }

  function renderContent(template, page, contentProcessors) {

    var split = template.split(CONTENT_MARKER);

    if (split.length === 1) {
      return processContent(template, page, contentProcessors);
    }

    if (split.length === 3) {
      return (
        split[0] +
        processContent(split[1], page, contentProcessors) +
        split[2]
      );
    }

    throw new Error('must not use content marker (' + CONTENT_MARKER + ') in template or page');
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
    var contentProcessors = druck.getContentProcessors(page);

    // (1.0) mark content-area if content processing is requested
    if (contentProcessors.length) {
      rendered = markContent(rendered);
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

    // (1.4) perform optional content post-processing
    if (contentProcessors.length) {
      rendered = renderContent(rendered, page, contentProcessors);
    }

    return rendered;
  }

  function generate(options) {

    var source = options.source,
        dest = options.dest,
        locals = assign({}, source, options.locals, helpers(options));

    var rendered = render(source, locals, true);
    druck.writeFile(dest, rendered);
    return rendered;
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

        var locals = assign({}, self, page);

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
