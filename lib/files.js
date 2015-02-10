var glob = require('glob');

module.exports = function Files(blg) {

  var cache = this._cache = {};

  function get(id) {
    var page = cache[id];

    if (!page) {
      page = cache[id] = blg.loadFile(id);
    }

    return page;
  }

  function all(pattern) {
    return glob.sync(pattern, { cwd: blg.config.source, nodir: true }).map(get);
  }

  all.get = get;

  return all;
};