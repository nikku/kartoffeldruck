const fs = require('fs');

const {
  forEach
} = require('min-dash');

const del = require('del');

const { Kartoffeldruck } = require('../..');


function createValidator(cwd) {

  return function(file, contents) {

    const realPath = cwd + '/dist/' + file;

    if (contents === false) {
      expect(fs.existsSync(realPath), `path ${realPath} NOT to exist`).to.be.false;

      return;
    }

    expect(fs.existsSync(realPath), `path ${realPath} to exist`).to.be.true;

    const realContents = fs.readFileSync(realPath, 'utf8');

    forEach(contents, function(c) {
      expect(realContents).to.contain(c);
    });
  };
}

function clean(druck) {
  return del(druck.config.dest);
}


describe('generator', function() {

  let druck, expectGenerated;

  describe('basic processing', function() {

    beforeEach(function() {
      druck = new Kartoffeldruck({ cwd: 'example' });

      expectGenerated = createValidator('example');
    });

    afterEach(function() {
      return clean(druck);
    });


    it('should generate multiple posts', async function() {

      // when
      await druck.generate({
        source: 'posts/*.md',
        dest: ':name/index.html'
      });

      // then
      expectGenerated('posts/01-first/index.html', [
        '<title>first</title>',
        '<h2 id="this-is-a-subheading">This is a subheading</h2>',
        '<p>../../some-absolute-path</p>',
        '<div class="sidebar">'
      ]);

      expectGenerated('posts/02-second/index.html', [
        '<title>second</title>'
      ]);
    });


    it('should aggregate / paginate items in single post', async function() {

      // given
      const posts = await druck.files('posts/*');

      // when
      await druck.generate({
        source: 'index.html',
        dest: ':page/index.html',
        locals: { items: posts },
        paginate: 1
      });

      // then
      expectGenerated('index.html', [
        '<title>My blog</title>',
        '<h2>Welcome to my blog</h2>',
        '<h1><a href="posts/01-first">first</a></h1>',
        '<a href="2">next</a>'
      ]);

      expectGenerated('2/index.html', [
        '<h1><a href="../posts/02-second">second</a></h1>',
        '<a href="../">previous</a>'
      ]);
    });


    it('should aggregate / paginate items in single post / empty collection', async function() {

      // when
      await druck.generate({
        source: 'index.html',
        dest: ':page/index.html',
        locals: { items: [] },
        paginate: 1
      });

      // then
      expectGenerated('index.html', [
        '<title>My blog</title>',
        '<h2>Welcome to my blog</h2>'
      ]);
    });


    it('should aggregate tagged', async function() {

      // given
      const posts = await druck.files('posts/*');

      // extract tags

      const tagged = {};

      posts.forEach(function(p) {
        (p.tags || []).forEach(function(tag) {
          const t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
          t.items.push(p);
        });
      });

      // when
      for (const [ _, t ] of Object.entries(tagged)) {
        await druck.generate({
          source: '_tagged.html',
          dest: '_tagged/:tag/:page/index.html',
          locals: t,
          paginate: 1
        });
      }

      // then
      expectGenerated('_tagged/a/index.html', [
        '<title>Posts tagged with a</title>',
        '<h2>2 Tagged with a</h2>',
        '<h1><a href="../../posts/01-first">first</a></h1>'
      ]);

      expectGenerated('_tagged/a/2/index.html', [
        '<h1><a href="../../../posts/02-second">second</a></h1>'
      ]);
    });


    it('should generate tag cloud', async function() {

      // given
      const posts = await druck.files('posts/*');

      // extract tags

      const tagged = {};

      posts.forEach(function(p) {
        (p.tags || []).forEach(function(tag) {
          const t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
          t.items.push(p);
        });
      });

      // when
      await druck.generate({
        source: '_tags.html',
        dest: '_tagged/index.html',
        locals: { tags: tagged }
      });

      // then
      expectGenerated('_tagged/index.html', [
        '<div class="tag-cloud">',
        '<span class="tag" data-length="2">a</span>'
      ]);

    });

  });


  describe('index pages', function() {

    beforeEach(function() {
      druck = new Kartoffeldruck({ cwd: 'test/fixtures/index-pages' });

      expectGenerated = createValidator('test/fixtures/index-pages');
    });

    afterEach(function() {
      return clean(druck);
    });


    it('should generate', async function() {

      // when
      await druck.generate({
        source: '**/*.{html,md}',
        dest: ':context/index.html'
      });

      // then
      expectGenerated('index.html', [
        'INDEX',
        '<a href="sub/nested">NESTED</a>'
      ]);

      expectGenerated('sub/index.html', [
        'SUB - INDEX',
        '<a href="../sub/nested">NESTED</a>'
      ]);

      expectGenerated('sub/nested/index.html', [
        'SUB - NESTED'
      ]);
    });


    it('should exclude index page', async function() {

      // when
      await druck.generate({
        source: '**/!(index).{html,md}',
        dest: ':context/index.html'
      });

      // then
      expectGenerated('sub/index.html', false);
      expectGenerated('index.html', false);
    });

  });


  describe('layout', function() {

    beforeEach(function() {
      druck = new Kartoffeldruck({ cwd: 'test/fixtures/layout' });

      expectGenerated = createValidator('test/fixtures/layout');
    });

    afterEach(function() {
      return clean(druck);
    });


    it('should generate (no default layout)', async function() {

      // when
      await druck.generate({
        source: '*.md',
        dest: ':name.html'
      });

      // then
      expectGenerated('layout.html', [
        'OTHER',
        'LAYOUT'
      ]);

      expectGenerated('no-layout.html', [
        'NO_LAYOUT'
      ]);
    });


    it('should generate (default layout)', async function() {

      // given
      druck.init({
        locals: {
          layout: 'default'
        }
      });

      // when
      await druck.generate({
        source: '*.md',
        dest: ':name.html'
      });

      // then
      expectGenerated('layout.html', [
        'OTHER',
        'LAYOUT'
      ]);

      expectGenerated('no-layout.html', [
        'DEFAULT',
        'NO_LAYOUT'
      ]);
    });

  });


  describe('helpers', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'example' });

      expectGenerated = createValidator('example');
    });

    after(function() {
      clean(druck);
    });


    it('should use custom date helper', function() {

      expectGenerated('_helpers/index.html', [
        '<span>date 2010</span>',
        '<span>string 10/10/2010</span>',
        '<span>num October 10th 2010</span>'
      ]);

    });


    it('should use custom author helper', function() {

      // then
      expectGenerated('_helpers/index.html', [
        '<span>author <span class="author">Nico</span></span>',
        '<span>author linked <a class="author" href="https://github.com/nikku">Nico</a></span>'
      ]);
    });

  });


  describe('macro support', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'test/fixtures/macro-support' });

      expectGenerated = createValidator('test/fixtures/macro-support');
    });

    after(function() {
      clean(druck);
    });


    it('should process macros defined in templates', function() {

      expectGenerated('layout-macro.html', [
        '<img src="foo.gif" class="" />',
        '<span class="caption">FOO</span>'
      ]);

    });


    it('should process macros defined in template includes', function() {

      expectGenerated('layout-macro-include.html', [
        '<img src="foo.gif" class="" />',
        '<span class="caption">FOO</span>'
      ]);

    });


    it('should process macros defined in template outside block', function() {

      expectGenerated('layout-macro-include-block.html', [
        '<img src="foo.gif" class="" />',
        '<span class="caption">FOO</span>'
      ]);

    });


    it('should process macros defined in page', function() {

      expectGenerated('page-macro.html', [
        '<h1>Hello World!</h1>'
      ]);

    });

  });


  describe('async support', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'test/fixtures/async-runner' });

      expectGenerated = createValidator('test/fixtures/async-runner');
    });

    after(function() {
      clean(druck);
    });


    it('should render files', function() {

      expectGenerated('test.html', [
        'TEST'
      ]);
    });

  });


  describe('nested render', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'test/fixtures/nested-render' });

      expectGenerated = createValidator('test/fixtures/nested-render');
    });

    after(function() {
      clean(druck);
    });


    it('should render nested with custom layout', function() {

      expectGenerated('outer.html', [
        'OUTER',
        'FOO'
      ]);
    });

  });


  describe('non-markdown content', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'test/fixtures/non-markdown' });

      expectGenerated = createValidator('test/fixtures/non-markdown');
    });

    after(function() {
      clean(druck);
    });


    it('should generate multiple non-markdown posts', function() {

      expectGenerated('posts/01-first/index.html', [
        '## A markdown headline'
      ]);

      expectGenerated('posts/02-second/index.html', [
        'Other post.\n\n*YEA*!'
      ]);

    });


    it('should aggregate / paginate items in single post', function() {

      expectGenerated('index.html', [
        '## A markdown headline',
        'Other post.\n\n*YEA*!'
      ]);

    });

  });


  describe('content processors', function() {

    before(async function() {
      druck = await Kartoffeldruck.run({ cwd: 'test/fixtures/content-processors' });

      expectGenerated = createValidator('test/fixtures/content-processors');
    });

    after(function() {
      clean(druck);
    });


    describe('defaults', function() {

      it('should process md files as markdown by default', function() {

        expectGenerated('markdown.html', [
          '\n<h2 id="this-file-is-markdown-processed-by-default">This file is markdown-processed by default.</h2>\n\n\n'
        ]);

      });


      it('should not process non-md files by default', function() {

        expectGenerated('as-is.html', [
          '## This file is not processed.'
        ]);

      });

    });


    describe('content processors', function() {

      it('should apply custom processors', async function() {

        druck.configure({
          contentProcessors: {
            '*.uppercase': function(content, page) { return content.toLowerCase(); },
            '*': function(content, page) { return content; }
          }
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('to-lowercase.html', [
          'all text here is uppercase.'
        ]);

        expectGenerated('test.html', [
          '<h1>TEST</h1>'
        ]);

        expectGenerated('as-is.html', [
          '## This file is not processed.'
        ]);

      });


      it('should apply contentProcessors=fn', async function() {

        druck.configure({
          contentProcessors: function(page) {
            expect(page).to.exist;

            if (page.id.endsWith('.uppercase')) {

              return function(content, page) {
                return content.toLowerCase();
              };
            }

            if (page.id.startsWith('as-is')) {
              return function(content) {
                return 'HTML';
              };
            }
          }
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('to-lowercase.html', [
          'all text here is uppercase.'
        ]);

        expectGenerated('as-is.html', [
          'HTML'
        ]);

      });


      it('should apply contentProcessors=fn, returning null', async function() {

        druck.configure({
          contentProcessors: function(page) {
            expect(page).to.exist;
          }
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('to-lowercase.html', [
          'ALL TEXT HERE IS UPPERCASE.'
        ]);

      });


      it('should apply contentProcessors=object', async function() {

        druck.configure({
          contentProcessors: {
            '*.uppercase': function(content, page) { return content.toLowerCase(); }
          }
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('to-lowercase.html', [
          'all text here is uppercase.'
        ]);

        expectGenerated('as-is.html', [
          '## This file is not processed.'
        ]);

      });


      it('should disable on contentProcessors=false', async function() {

        druck.configure({
          contentProcessors: false
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('markdown.html', [
          '## This file is markdown-processed by default.'
        ]);

      });


      it('should use custom processors only', async function() {

        let called = false;
        druck.configure({
          contentProcessors: {
            'dummy': function(content, page) { called = true; return content; }
          }
        });

        await druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('markdown.html', [
          '## This file is markdown-processed by default.'
        ]);

        expect(called).to.be.false;

      });
    });

  });

});
