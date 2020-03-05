/* global Promise */

module.exports = function(druck) {

  druck.generate({
    source: 'test.html',
    dest: 'test.html'
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};