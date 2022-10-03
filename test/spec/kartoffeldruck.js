const path = require('path');

const GeneratorMock = require('../mock/generator');

const { Kartoffeldruck } = require('../..');


describe('kartoffeldruck.js descriptor', function() {

  describe('druck', function() {

    let druck, generator;

    beforeEach(function() {
      generator = new GeneratorMock();

      druck = new Kartoffeldruck({
        cwd: path.resolve('example'),
        generator
      });
    });


    describe('#files', function() {

      it('should glob existing', async function() {

        // when
        const entries = await druck.files('posts/*.md');

        // then
        expect(entries.length).to.eql(2);

        expect(entries).to.eql([
          {
            id: 'posts/01-first.md',
            name: 'posts/01-first',
            body:
              'Hello blog!\n' +
              '\n' +
              '## This is a subheading\n' +
              '\n' +
              '{{ relative("some-absolute-path") }}',
            title: 'first',
            tags: [ 'a', 'b', 'c' ],
            layout: 'post'
          },
          {
            id: 'posts/02-second.md',
            name: 'posts/02-second',
            body: 'Other post.\n\n*YEA*!',
            title: 'second',
            tags: [ 'a' ],
            draft: true,
            layout: 'post'
          }
        ]);
      });


      it('should glob non-existing', async function() {

        // when
        const entries = await druck.files('non-existing.html');

        // then
        expect(entries.length).to.eql(0);
      });


      describe('#get', function() {

        it('should not fail on non-existing', async function() {

          // when
          const entry = await druck.files.get('non-existing.html');

          // then
          expect(entry).not.to.exist;
        });


        it('should parse front matter', async function() {

          // when
          const entry = await druck.files.get('posts/01-first.md');

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

      it('should generate multiple posts', async function() {

        // when
        const generated = await druck.generate({
          source: 'posts/*.md',
          dest: ':name/index.html'
        });

        const expectedResult = [
          {
            dest: 'posts/01-first/index.html',
            source: {
              body: 'Hello blog!\n\n## This is a subheading\n\n{{ relative("some-absolute-path") }}',
              id: 'posts/01-first.md',
              layout: 'post',
              name: 'posts/01-first',
              tags: [ 'a', 'b', 'c' ],
              title: 'first'
            },
            locals: {},
            rendered: 'rendered'
          },
          {
            dest: 'posts/02-second/index.html',
            source: {
              body: 'Other post.\n\n*YEA*!',
              draft: true,
              id: 'posts/02-second.md',
              layout: 'post',
              name: 'posts/02-second',
              tags: [ 'a' ],
              title: 'second'
            },
            locals: {},
            rendered: 'rendered'
          }
        ];

        // then
        expect(generated).to.eql(expectedResult);
      });


      it('should aggregate items over multiple pages', async function() {

        // given
        const posts = await druck.files('posts/*');

        const allItems = [
          {
            body: 'Hello blog!\n\n## This is a subheading\n\n{{ relative("some-absolute-path") }}',
            id: 'posts/01-first.md',
            layout: 'post',
            name: 'posts/01-first',
            tags: [ 'a', 'b', 'c' ],
            title: 'first'
          },
          {
            body: 'Other post.\n\n*YEA*!',
            draft: true,
            id: 'posts/02-second.md',
            layout: 'post',
            name: 'posts/02-second',
            tags: [ 'a' ],
            title: 'second'
          }
        ];

        // when
        const generated = await druck.generate({
          source: 'index.html',
          dest: ':page/index.html',
          locals: { items: posts },
          paginate: 1
        });

        const expectedResult = [
          {
            dest: 'index.html',
            locals: {
              allItems: allItems,
              items: [ allItems[0] ],
              page: {
                idx: 0,
                nextRef: '2',
                previousRef: null,
                firstRef: '',
                lastRef: '2',
                totalPages: 2
              }
            },
            source: {
              body: '{% block header %}\n  <h2>Welcome to my blog</h2>\n{% endblock %}',
              id: 'index.html',
              layout: 'post_list',
              name: 'index',
              title: 'My blog'
            },
            rendered: 'rendered'
          },
          {
            dest: '2/index.html',
            locals: {
              allItems: allItems,
              items: [ allItems[1] ],
              page: {
                idx: 1,
                nextRef: null,
                previousRef: '',
                firstRef: '',
                lastRef: '2',
                totalPages: 2
              }
            },
            source: {
              body: '{% block header %}\n  <h2>Welcome to my blog</h2>\n{% endblock %}',
              id: 'index.html',
              layout: 'post_list',
              name: 'index',
              title: 'My blog'
            },
            rendered: 'rendered'
          }
        ];

        // then
        expect(generated).to.eql(expectedResult);
      });


      it('should aggregate items on single page', async function() {

        // given
        const posts = await druck.files('posts/*');

        const allItems = [
          {
            body: 'Hello blog!\n\n## This is a subheading\n\n{{ relative("some-absolute-path") }}',
            id: 'posts/01-first.md',
            layout: 'post',
            name: 'posts/01-first',
            tags: [ 'a', 'b', 'c' ],
            title: 'first'
          },
          {
            body: 'Other post.\n\n*YEA*!',
            draft: true,
            id: 'posts/02-second.md',
            layout: 'post',
            name: 'posts/02-second',
            tags: [ 'a' ],
            title: 'second'
          }
        ];

        // when
        const generated = await druck.generate({
          source: 'index.html',
          dest: ':page/index.html',
          locals: { items: posts },
          paginate: 3
        });

        const expectedResult = [
          {
            dest: 'index.html',
            locals: {
              allItems: allItems,
              items: allItems,
              page: {
                idx: 0,
                nextRef: null,
                previousRef: null,
                firstRef: '',
                lastRef: '',
                totalPages: 1
              }
            },
            source: {
              body: '{% block header %}\n  <h2>Welcome to my blog</h2>\n{% endblock %}',
              id: 'index.html',
              layout: 'post_list',
              name: 'index',
              title: 'My blog'
            },
            rendered: 'rendered'
          }
        ];

        // then
        expect(generated).to.eql(expectedResult);
      });
    });


    describe('config.locals', function() {

      it('should provide default locals', async function() {

        // given
        druck.config.locals = { foo: 'BAR' };

        // when
        const generated = await druck.generate({
          source: 'posts/01-first.md',
          dest: 'posts/01-first/index.html'
        });

        const expectedResult = {
          dest: 'posts/01-first/index.html',
          locals: {
            foo: 'BAR'
          },
          source: {
            body: 'Hello blog!\n\n## This is a subheading\n\n{{ relative("some-absolute-path") }}',
            id: 'posts/01-first.md',
            layout: 'post',
            name: 'posts/01-first',
            tags: [ 'a', 'b', 'c' ],
            title: 'first'
          },
          rendered: 'rendered'
        };

        // then
        expect(generated).to.eql(expectedResult);
      });

    });


    describe('events', function() {

      describe('generated', function() {

        it('should trigger on paginated page generation', async function() {

          // given
          const posts = await druck.files('posts/*');

          const capturedEvents = [];

          druck.on('generated', function(event) {
            capturedEvents.push(event);
          });

          // when
          const generated = await druck.generate({
            source: 'index.html',
            dest: ':page/index.html',
            locals: { items: posts },
            paginate: 1,
            customProp: 'FOO'
          });

          // then
          expect(capturedEvents).to.eql(generated);
        });


        it('should trigger on wildcard page generation', async function() {

          // given
          const capturedEvents = [];

          druck.on('generated', function(event) {
            capturedEvents.push(event);
          });

          // when
          const generated = await druck.generate({
            source: 'posts/*',
            dest: ':name/index.html',
            customProp: 'HOME'
          });

          // then
          expect(capturedEvents).to.eql(generated);
        });

      });

    });

  });

});
