var fs = require('fs');

var forEach = require('lodash/collection/forEach');

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


describe('generator', function() {

  var druck, expectGenerated;

  describe('basic processing', function() {

    beforeEach(function() {
      druck = new Kartoffeldruck({ cwd: 'example' });

      expectGenerated = createValidator('example');
    });

    afterEach(function() {
      druck.clean();
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
        '<h2>Tagged with a</h2>',
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

    before(function() {
      druck = Kartoffeldruck.run({ cwd: 'example' });

      expectGenerated = createValidator('example');
    });

    after(function() {
      druck.clean();
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

    before(function() {
      druck = Kartoffeldruck.run({ cwd: 'test/fixtures/macro-support' });

      expectGenerated = createValidator('test/fixtures/macro-support');
    });

    after(function() {
      druck.clean();
    });


    it('should enable the use of macros defined in templates within pages', function() {

      expectGenerated('layout-macro.html', [
        '<img src="foo.gif" class="" />',
        '<span class="caption">FOO</span>'
      ]);

    });


    it('should allow macro definitions from within a page', function() {

      expectGenerated('page-macro.html', [
        '<h1>Hello World!</h1>'
      ]);

    });

  });

});
