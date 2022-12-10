module.exports = async function(druck) {

  druck.init({
    locals: {
      layout: 'default'
    }
  });

  await druck.generate({
    source: '*.md',
    dest: ':name/index.html'
  });

};
