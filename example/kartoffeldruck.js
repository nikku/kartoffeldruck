var forEach = require('lodash/collection/forEach');

module.exports = function(druck) {

  druck.init({
    source: 'pages',
    dest: 'dist',
    templates: 'templates'
  });

  // install custom helpers

  var nunjucks = druck.config.nunjucks;

  nunjucks.addFilter('date', require('nunjucks-date'));

  // you can add your own helpers, too
  nunjucks.addFilter('author', require('./helpers/author'));


  // grep for files

  var posts = druck.files('posts/*');

  // filter published / unpublished posts

  var published = posts.filter(function(p) { return !p.draft; }),
      unpublished = posts.filter(function(p) { return p.draft; });

  // extract tags

  // guess what, you can use actuall javascript to do it!
  // use the same approach to create categories, tocs, ... in your application
  var tagged = {};

  posts.forEach(function(p) {
    (p.tags || []).forEach(function(tag) {
      var t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
      t.items.push(p);
    });
  });

  // if you would like to make the tagged variable available
  // across the whole site

  druck.config.locals.tagged = tagged;


  // each post on its own page

  druck.generate({
    source: posts,
    dest: ':name/index.html'
  });

  // published posts list

  druck.generate({
    source: 'index.html',
    dest: ':page/index.html',
    locals: { items: published },
    paginate: 5
  });

  // drafts pages

  druck.generate({
    source: '_drafts.html',
    dest: '_drafts/:page/index.html',
    locals: { items: unpublished },
    paginate: 5
  });

  // each tag page

  forEach(tagged, function(t) {
    druck.generate({
      source: '_tagged.html',
      dest: '_tagged/:tag/:page/index.html',
      locals: t,
      paginate: 5
    });
  });

  // a tags overview page

  druck.generate({
    source: '_tags.html',
    dest: '_tagged/index.html',
    locals: { tags: tagged }
  });


  // custom helpers in a nutshell

  var dateString = '2010-10-10';

  druck.generate({
    source: '_helpers.html',
    dest: '_helpers/index.html',
    locals: {
      dateString: dateString,
      dateNum: new Date(dateString).getTime(),
      date: new Date(dateString),
      author: 'Nico',
      authorLinked: 'Nico<https://github.com/nikku>'
    }
  });
};