var path = require('path');

var GeneratorMock = require('../mock/generator');

var Kartoffeldruck = require('../../');


describe('kartoffeldruck.js descriptor', function() {

  describe('druck', function() {

    var druck, generator;

    beforeEach(function() {
      generator = new GeneratorMock();
      druck = new Kartoffeldruck({ cwd: path.resolve('example'), generator: generator });
    });


    describe('#files', function() {

      it('should glob existing', function() {
        // when
        var entries = druck.files('posts/*.md');

        // then
        expect(entries.length).to.eql(2);
      });


      it('should glob non-existing', function() {
        // when
        var entries = druck.files('non-existing.html');

        // then
        expect(entries.length).to.eql(0);
      });


      describe('#get', function() {

        it('should not fail on non-existing', function() {
          // when
          var entry = druck.files.get('non-existing.html');

          // then
          expect(entry).not.to.exist;
        });


        it('should parse front matter', function() {
          // when
          var entry = druck.files.get('posts/01-first.md');

          // then
          expect(entry.id).to.eql('posts/01-first.md');
          expect(entry.name).to.eql('posts/01-first');

          expect(entry.tags).to.eql([ 'a', 'b', 'c' ]);
          expect(entry.title).to.eql('first');
          expect(entry.layout).to.eql('post');
        });

      });

    });


    describe('#generate', function() {

      it('should generate multiple posts', function() {

        // when
        druck.generate({
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
        var posts = druck.files('posts/*');

        // when
        druck.generate({
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


    describe('config.locals', function() {

      it('should provide default locals', function() {

        // given
        druck.config.locals = { foo: 'BAR' };

        // when
        druck.generate({
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


    describe('events', function() {

      it('should trigger an event on paginated page generation', function() {

        // given
        var posts = druck.files('posts/*');

        var results = [];
        druck.on('generated', function(event) {
          results.push(event);
        });

        // when
        druck.generate({
          source: 'index.html',
          dest: ':page/index.html',
          locals: { items: posts },
          paginate: 1,
          myCustomProp: 'HOME'
        });

        // then
        expect(results.length).to.eql(2);

        expect(results[0].dest).to.eql('index.html');
        expect(results[1].dest).to.eql('2/index.html');

        results.every(function(result, index) {
          expect(result.rendered).to.eql('rendered');
          expect(result.myCustomProp).to.eql('HOME');
          expect(result.locals.items).to.eql([posts[index]]);
        });
      });

      it('should trigger an event on wildcard page generation', function() {

        // given
        var results = [];
        druck.on('generated', function(event) {
          results.push(event);
        });

        // when
        druck.generate({
          source: 'posts/*',
          dest: ':name/index.html',
          myCustomProp: 'HOME'
        });

        // then
        expect(results.length).to.eql(2);

        expect(results[0].source.id).to.eql('posts/01-first.md');
        expect(results[0].dest).to.eql('posts/01-first/index.html');
        expect(results[1].source.id).to.eql('posts/02-second.md');
        expect(results[1].dest).to.eql('posts/02-second/index.html');

        results.every(function(result) {
          expect(result).to.contain.all.keys('dest', 'source', 'rendered', 'locals', 'myCustomProp');
          expect(result.rendered).to.eql('rendered');
          expect(result.myCustomProp).to.eql('HOME');
        });
      });

    });

  });

});
