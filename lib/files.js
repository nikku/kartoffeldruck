var glob = require('glob');

module.exports = function Files(druck) {

  var cache = this._cache = {};

  function get(id) {
    var page = cache[id];

    if (!page) {
      page = cache[id] = druck.loadFile(id);
    }

    return page;
  }

  function all(pattern) {
    return glob.sync(pattern, { cwd: druck.config.source, nodir: true }).map(get);
  }

  all.get = get;

  return all;
};