var nunjucksDate = require('nunjucks-date');

var forEach = require('lodash/collection/forEach');

module.exports = function(druck) {

  druck.init({
    source: 'pages',
    dest: 'dist',
    templates: 'templates'
  });

  // install custom date helper

  nunjucksDate.install(druck.config.nunjucks);


  var posts = druck.files('posts/*');

  // filter published / unpublished posts

  var published = posts.filter(function(p) { return !p.draft; }),
      unpublished = posts.filter(function(p) { return p.draft; });

  // extract tags

  var tagged = {};

  posts.forEach(function(p) {
    (p.tags || []).forEach(function(tag) {
      var t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
      t.items.push(p);
    });
  });

  druck.generate({
    source: posts,
    dest: ':name/index.html'
  });

  druck.generate({
    source: 'index.html',
    dest: ':page/index.html',
    locals: { items: published },
    paginate: 5
  });

  druck.generate({
    source: '_drafts.html',
    dest: '_drafts/:page/index.html',
    locals: { items: unpublished },
    paginate: 5
  });

  forEach(tagged, function(t) {
    druck.generate({
      source: '_tagged.html',
      dest: '_tagged/:tag/:page/index.html',
      locals: t,
      paginate: 5
    });
  });

  // when
  druck.generate({
    source: '_tags.html',
    dest: '_tagged/index.html',
    locals: { tags: tagged }
  });


  // custom date helper can be installed
  var dateString = '2010-10-10';

  druck.generate({
    source: '_date.html',
    dest: '_date/index.html',
    locals: {
      dateString: dateString,
      dateNum: new Date(dateString).getTime(),
      date: new Date(dateString)
    }
  });
};