# kartoffeldruck

[![CI](https://github.com/nikku/kartoffeldruck/workflows/CI/badge.svg)](https://github.com/nikku/kartoffeldruck/actions?query=workflow%3ACI)

An intentionally non-pluggable, all-in-one, opinionated static site generator. Built with the zen of [kartoffeldruck](https://de.wikipedia.org/wiki/Kartoffeldruck).

![kartoffeldruck image](https://c1.staticflickr.com/9/8087/8373666593_b3dd99259c_z.jpg)

[Image CC BY-SA 2.0, Walter Stempelo](https://www.flickr.com/photos/stempelo/8373666593)


## Features

[kartoffeldruck](https://github.com/nikku/kartoffeldruck) is a full fledged site generation solution. An incomplete list of features:

* [Markdown](https://github.com/chjj/marked) and [Nunjucks](https://mozilla.github.io/nunjucks/) templating support
* Front matters
* Pagination
* Draft posts
* Fetch tags and generate tag clouds
* Generate table of contents
* Custom urls (slugify, ...)
* Custom helpers
* Custom content processors

We intentionally _do not_ provide any css processing pipelines or asset copy utilities. Use other tools [that](https://github.com/gruntjs/grunt-contrib-less) [do](https://github.com/dlmanning/gulp-sass) the [job](https://github.com/gruntjs/grunt-contrib-copy).


## Resources

* [Issues](https://github.com/nikku/kartoffeldruck/issues)
* [Example Project](https://github.com/nikku/kartoffeldruck/tree/master/example)


## Usage

Place a `kartoffeldruck.js` file in your current project directory:

```javascript
/**
 * @param { import('kartoffeldruck').Kartoffeldruck } druck
 */
module.exports = async function(druck) {

  // initialize the kartoffeldruck instance
  // you may specify (global) template locals
  // as well as the place for templates, pages, assets and dest more
  druck.init({
    locals: {
      site: {
        title: 'My Site'
      }
    }
  });


  await druck.generate({
    source: '*.md',
    dest: ':name/index.html'
  });
};
```

Install the `kartoffeldruck` globally via [npm](https://npmjs.org):

```shell
$ npm i -g kartoffeldruck
```

Run `kartoffeldruck` in the current directory. It will pick up your runner file and generate the site into the `dist` directory (or whatever is specified as `dest` via `druck.init(options)`.


```
$ kartoffeldruck
Generating site in /some-dir
Done
```

Alternatively, run `kartoffeldruck` directly via `npx`:

```
$ npx kartoffeldruck
```

Check out the [example project](https://github.com/nikku/kartoffeldruck/tree/master/example) to learn more about what is possible with the library.


## Alternatives

You would like to spend hours composing a site generation solution yourself? Try out [metalsmith](http://metalsmith.io/). You would rather like to use Ruby anyway? Try [jekyll](http://jekyllrb.com/). You want to experiment? Role your own.


## Grunt Integration

Simply add the following task to your `Gruntfile.js`:

```
grunt.registerTask('kartoffeldruck', function() {
  var done = this.async();

  var {
    Kartoffeldruck
  } = require('kartoffeldruck');

  Kartoffeldruck.run({
    logger: {
      debug: grunt.log.ok,
      info: grunt.log.ok
    }
  }).then(
    () => done(),
    (err) => done(err)
  );
});
```

It will pick up your local `kartoffeldruck.js` file and generate the blog from there.


## License

MIT
