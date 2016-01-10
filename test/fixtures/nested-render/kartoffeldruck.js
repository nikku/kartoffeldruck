module.exports = function(druck) {

  var include = druck.files.get('include.html');

  druck.generate({
    source: 'outer.html',
    dest: ':name.html',
    locals: {
      include: include
    }
  });

};