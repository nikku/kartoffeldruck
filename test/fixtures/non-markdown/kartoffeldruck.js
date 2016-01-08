var forEach = require('lodash/collection/forEach');

module.exports = function(druck) {

  // grep for files

  var posts = druck.files('posts/*');

  // each post on its own page

  druck.generate({
    source: posts,
    dest: ':name/index.html'
  });

  // published posts list

  druck.generate({
    source: 'index.html',
    dest: ':page/index.html',
    locals: { items: posts },
    paginate: 5
  });
};
