module.exports = async function(druck) {

  var include = await druck.files.get('include.html');

  await druck.generate({
    source: 'outer.html',
    dest: ':name.html',
    locals: {
      include: include
    }
  });

};