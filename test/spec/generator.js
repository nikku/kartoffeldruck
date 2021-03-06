var fs = require('fs');

var {
  forEach
} = require('min-dash');

var del = require('del');

var Kartoffeldruck = require('../../');


function createValidator(cwd) {

  return function(file, contents) {

    var realPath = cwd + '/dist/' + file;

    expect(fs.existsSync(realPath)).to.be.true;

    var realContents = fs.readFileSync(realPath, 'utf8');

    forEach(contents, function(c) {
      expect(realContents).to.contain(c);
    });
  };
}

function clean(druck) {
  del.sync(druck.config.dest);
}


describe('generator', function() {

  var druck, expectGenerated;

  describe('basic processing', function() {

    beforeEach(function() {
      druck = new Kartoffeldruck({ cwd: 'example' });

      expectGenerated = createValidator('example');
    });

    afterEach(function() {
      clean(druck);
    });


    it('should generate multiple posts', function() {

      // when
      druck.generate({
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


    it('should aggregate / paginate items in single post', function() {

      // given
      var posts = druck.files('posts/*');

      // when
      druck.generate({
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


    it('should aggregate / paginate items in single post / empty collection', function() {

      // when
      druck.generate({
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


    it('should aggregate tagged', function() {

      // given
      var posts = druck.files('posts/*');

      // extract tags

      var tagged = {};

      posts.forEach(function(p) {
        (p.tags || []).forEach(function(tag) {
          var t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
          t.items.push(p);
        });
      });

      // when
      forEach(tagged, function(t) {
        druck.generate({
          source: '_tagged.html',
          dest: '_tagged/:tag/:page/index.html',
          locals: t,
          paginate: 1
        });
      });

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


    it('should generate tag cloud', function() {

      // given
      var posts = druck.files('posts/*');

      // extract tags

      var tagged = {};

      posts.forEach(function(p) {
        (p.tags || []).forEach(function(tag) {
          var t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
          t.items.push(p);
        });
      });

      // when
      druck.generate({
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

      it('should apply custom processors', function() {

        druck.configure({
          contentProcessors: {
            '*.uppercase': function(content, page) { return content.toLowerCase(); },
            '*': function(content, page) { return content; }
          }
        });

        druck.generate({
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


      it('should apply contentProcessors=fn', function() {

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

        druck.generate({
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


      it('should apply contentProcessors=fn, returning null', function() {

        druck.configure({
          contentProcessors: function(page) {
            expect(page).to.exist;
          }
        });

        druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('to-lowercase.html', [
          'ALL TEXT HERE IS UPPERCASE.'
        ]);

      });


      it('should apply contentProcessors=object', function() {

        druck.configure({
          contentProcessors: {
            '*.uppercase': function(content, page) { return content.toLowerCase(); }
          }
        });

        druck.generate({
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


      it('should disable on contentProcessors=false', function() {

        druck.configure({
          contentProcessors: false
        });

        druck.generate({
          source: '*',
          dest: ':name.html'
        });

        expectGenerated('markdown.html', [
          '## This file is markdown-processed by default.'
        ]);

      });


      it('should use custom processors only', function() {

        var called = false;
        druck.configure({
          contentProcessors: {
            'dummy': function(content, page) { called = true; return content; }
          }
        });

        druck.generate({
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
