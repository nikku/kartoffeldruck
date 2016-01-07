module.exports = function(druck) {

  druck.generate({
    source: '*.md',
    dest: ':name.html'
  });

};
