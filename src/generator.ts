import {
  assign,
  isString,
  reduce
} from 'min-dash';

const CONTENT_MARKER = '<~~content~marker~~>';

import { Locals } from './types';

import Page from './page';


export function createGenerator(druck) {
  return new Generator(druck);
}

export class Generator {

  /**
   * Generates a given blog configuration
   */
  generate: (options: { source: Page, locals: Locals, dest: string }) => Promise<string>;

  constructor(druck) {

    function renderNunjucks(template, locals, path) {
      return druck.getNunjucks().renderString(template, locals, { path });
    }

    function markContent(template) {
      return CONTENT_MARKER + template + CONTENT_MARKER;
    }

    function processContent(content, page, contentProcessors) {
      const processed = reduce(contentProcessors, function(content, contentProcessor) {
        return contentProcessor(content, page);
      }, content);

      return processed;
    }

    function renderContent(template, page, contentProcessors) {

      const split = template.split(CONTENT_MARKER);

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
      locals = reduce(locals, function(l, val, key) {
        if (isString(val) && key !== 'body' && /\{\{.*\}\}/.test(val)) {
          l[key] = renderNunjucks(val, locals, page.id);
        } else {
          l[key] = val;
        }

        return l;
      }, {});

      let rendered = page.body;
      const contentProcessors = druck.getContentProcessors(page);

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

    async function generate(options) {

      const source = options.source,
            dest = options.dest,
            locals = assign({}, source, options.locals, helpers(options));

      const rendered = render(source, locals, true);

      await druck.writeFile(dest, rendered);

      return rendered;
    }

    /**
     * blog helpers
     */
    function helpers(options) {

      const dest = options.dest;

      const pathSeparator = dest.split('/').filter(part => part).map(function() { return ''; }).join('../');

      const self = {

        render(page, layout) {

          if (layout) {
            page = assign({}, page, { layout: layout });
          }

          const locals = assign({}, self, page);

          return render(page, locals, !!layout);
        },

        relative(path) {
          return pathSeparator + path;
        },

        assets: pathSeparator + 'assets'
      };

      return self;
    }

    this.generate = generate;
  }
}


// utilities //////////////////////////////////////////

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
