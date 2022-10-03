module.exports = async function(druck) {

  await druck.generate({
    source: 'test.html',
    dest: 'test.html'
  });
};