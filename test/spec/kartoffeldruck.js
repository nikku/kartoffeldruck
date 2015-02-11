var path = require('path');

var GeneratorMock = require('../mock/generator');

var Kartoffeldruck = require('../../');


describe('blg', function() {

  var blg, generator;

  beforeEach(function() {
    generator = new GeneratorMock();
    blg = new Kartoffeldruck({ cwd: path.resolve('example'), generator: generator });
  });


  describe('file access', function() {

    describe('all', function() {

      it('should glob existing', function() {
        // when
        var entries = blg.files('posts/*.md');

        // then
        expect(entries.length).to.eql(2);
      });


      it('should glob non-existing', function() {
        // when
        var entries = blg.files('non-existing.html');

        // then
        expect(entries.length).to.eql(0);
      });

    });


    describe('get', function() {

      it('should not fail on non-existing', function() {
        // when
        var entry = blg.files.get('non-existing.html');

        // then
        expect(entry).not.to.exist;
      });


      it('should parse front matter', function() {
        // when
        var entry = blg.files.get('posts/01-first.md');

        // then
        expect(entry.id).to.eql('posts/01-first.md');
        expect(entry.name).to.eql('posts/01-first');

        expect(entry.tags).to.eql([ 'a', 'b', 'c' ]);
        expect(entry.title).to.eql('first');
        expect(entry.layout).to.eql('post');
      });

    });

  });


  describe('file processing', function() {

    it('should generate multiple posts', function() {

      // when
      blg.generate({
        source: 'posts/*.md',
        dest: ':name/index.html'
      });

      var expectedResult =  [
        {
          dest: 'posts/01-first/index.html',
          source: {
            body: '\nHello blog!\n\n## This is a subheading\n\n{{ relative(\"some-absolute-path\") }}',
            id: 'posts/01-first.md',
            layout: 'post',
            name: 'posts/01-first',
            tags: [ 'a', 'b', 'c' ],
            title: 'first'
          },
          locals: {}
        },
        {
          dest: 'posts/02-second/index.html',
          source: {
            body: '\nOther post.\n\n*YEA*!',
            draft: true,
            id: 'posts/02-second.md',
            layout: 'post',
            name: 'posts/02-second',
            tags: [ 'a' ],
            title: 'second'
          },
          locals: {}
        }
      ];

      // then
      expect(generator._generated).to.eql(expectedResult);
    });


    it('should aggregate items in single post', function() {

      // given
      var posts = blg.files('posts/*');

      // when
      blg.generate({
        source: 'index.html',
        dest: ':page/index.html',
        locals: { items: posts },
        paginate: 1
      });

      var expectedResult = [
        {
          dest: 'index.html',
          locals: {
            items: [
              {
                body: '\nHello blog!\n\n## This is a subheading\n\n{{ relative(\"some-absolute-path\") }}',
                id: 'posts/01-first.md',
                layout: 'post',
                name: 'posts/01-first',
                tags: [ 'a', 'b', 'c' ],
                title: 'first'
              }
            ],
            page: {
              idx: 0,
              nextRef: '2',
              previousRef: null,
              totalPages: 2
            }
          },
          source: {
            body: '\n\n{% block header %}\n  <h2>Welcome to my blog</h2>\n{% endblock %}',
            id: 'index.html',
            layout: 'post_list',
            name: 'index',
            title: 'My blog'
          }
        },
        {
          dest: '2/index.html',
          locals: {
            items: [
              {
                body: '\nOther post.\n\n*YEA*!',
                draft: true,
                id: 'posts/02-second.md',
                layout: 'post',
                name: 'posts/02-second',
                tags: [ 'a' ],
                title: 'second'
              }
            ],
            page: {
              idx: 1,
              nextRef: null,
              previousRef: '',
              totalPages: 2
            }
          },
          source: {
            body: '\n\n{% block header %}\n  <h2>Welcome to my blog</h2>\n{% endblock %}',
            id: 'index.html',
            layout: 'post_list',
            name: 'index',
            title: 'My blog'
          }
        }
      ];

      // then
      expect(generator._generated).to.eql(expectedResult);
    });

  });


  describe('locals', function() {

    it('should provide default locals', function() {

      // given
      blg.config.locals = { foo: 'BAR' };

      // when
      blg.generate({
        source: 'posts/01-first.md',
        dest: 'posts/01-first/index.html'
      });

      var expectedResult = [
        {
          dest: 'posts/01-first/index.html',
          locals: {
            foo: 'BAR'
          },
          source: {
            body: '\nHello blog!\n\n## This is a subheading\n\n{{ relative(\"some-absolute-path\") }}',
            id: 'posts/01-first.md',
            layout: 'post',
            name: 'posts/01-first',
            tags: [ 'a', 'b', 'c' ],
            title: 'first'
          }
        }
      ];

      // then
      expect(generator._generated).to.eql(expectedResult);
    });

  });

});