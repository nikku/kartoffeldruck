module.exports = async function(druck) {

  await druck.generate({
    source: `**/*.md`,
    dest: `:context/index.html`
  });

};