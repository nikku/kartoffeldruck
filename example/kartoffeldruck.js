const { marked } = require('marked');

module.exports = async function(druck) {

  druck.init({
    source: 'pages',
    dest: 'dist',
    templates: 'templates'
  });

  // install custom helpers

  const nunjucks = druck.getNunjucks();

  nunjucks.addFilter('date', require('nunjucks-date'));

  // you can add your own helpers, too
  nunjucks.addFilter('author', require('./helpers/author'));


  // grep for files

  const posts = await druck.files('posts/*');

  // filter published / unpublished posts

  const published = posts.filter(function(p) { return !p.draft; });
  const unpublished = posts.filter(function(p) { return p.draft; });

  // extract tags

  // guess what, you can use actuall javascript to do it!
  // use the same approach to create categories, tocs, ... in your application
  const tagged = {};

  posts.forEach(function(p) {
    (p.tags || []).forEach(function(tag) {
      const t = tagged[tag] = (tagged[tag] || { tag: tag, items: [] });
      t.items.push(p);
    });
  });

  // if you would like to make the tagged constiable available
  // across the whole site

  druck.configure({
    locals: {
      tagged: tagged
    }
  });

  // per default, kartoffeldruck will render markdown;
  // if you'd like to change the default markdown processor
  // or plug in additional processors, use the following:

  druck.configure({
    contentProcessors: {
      '*.md': function(content, page) { return marked(content); },
      '*': function(content, page) { return content; }
    }
  });

  // each post on its own page

  await druck.generate({
    source: posts,
    dest: ':name/index.html'
  });

  // published posts list

  await druck.generate({
    source: 'index.html',
    dest: ':page/index.html',
    locals: { items: published },
    paginate: 5
  });

  // drafts pages

  await druck.generate({
    source: '_drafts.html',
    dest: '_drafts/:page/index.html',
    locals: { items: unpublished },
    paginate: 5
  });

  // each tag page

  for (const [ _, t ] of Object.entries(tagged)) {
    await druck.generate({
      source: '_tagged.html',
      dest: '_tagged/:tag/:page/index.html',
      locals: t,
      paginate: 5
    });
  }

  // a tags overview page

  await druck.generate({
    source: '_tags.html',
    dest: '_tagged/index.html',
    locals: { tags: tagged }
  });


  // custom helpers in a nutshell

  const dateString = '2010-10-10';

  await druck.generate({
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