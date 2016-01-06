module.exports = function(druck) {

  druck.configure({
    includes: [
      'macros/default.html'
    ]
  });

  druck.generate({
    source: '*.md',
    dest: ':name.html'
  });

};