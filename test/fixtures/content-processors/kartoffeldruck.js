module.exports = async function(druck) {

  await druck.generate({
    source: '*',
    dest: ':name.html'
  });

};
