var assign = require('lodash/object/assign'),
    mapValues = require('lodash/object/mapValues'),
    isString = require('lodash/lang/isString'),
    marked = require('marked'),
    nunjucks = require('nunjucks');

function Generator(blg) {

  var localNunjucks;

  blg.on('init', function(config) {
    localNunjucks = config.nunjucks = nunjucks.configure(config.templates);
  });

  function render(page, locals, layout) {

    // (0) ensure we replace template parameters
    // in locals
    locals = mapValues(locals, function(val, key) {
      if (isString(val) && key !== "body" && val.match(/\{\{.*\}\}/)) {
        return localNunjucks.renderString(val, locals);
      } else {
        return val;
      }
    });

    var rendered = page.body;

    if (blg.isMarkdown(page)) {
      // (1.0) resolve nunjucks templates / variables
      rendered = localNunjucks.renderString(rendered, locals);

      // (1.1) resolve markdown
      rendered = marked(rendered);

      if (layout && page.layout) {
        // (1.2) resolve as post if layout is needed
        rendered =
          '{% extends "' + page.layout + '.html" %}\n' +
          '{% block item_body %}\n' +
          rendered + '\n' +
          '{% endblock %}\n';

        rendered = localNunjucks.renderString(rendered, locals);
      }
    } else {
      if (layout && page.layout) {
        // (2.0) resolve as post if layout is needed
        rendered =
          '{% extends "' + page.layout + '.html" %}\n' +
          page.body;
      }

      rendered = localNunjucks.renderString(rendered, locals);
    }

    return rendered;
  }

  function generate(options) {

    var source = options.source,
        locals = assign({}, source, options.locals, helpers(options));

    var rendered = render(source, locals, true);
    blg.writeFile(options.dest, rendered);
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