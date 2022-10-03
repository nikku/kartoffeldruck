module.exports = async function(druck) {

  // grep for files

  var posts = await druck.files('posts/*');

  // each post on its own page

  await druck.generate({
    source: posts,
    dest: ':name/index.html'
  });

  // published posts list

  await druck.generate({
    source: 'index.html',
    dest: ':page/index.html',
    locals: { items: posts },
    paginate: 5
  });
};
