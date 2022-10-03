var glob = require('tiny-glob');

module.exports = function Files(druck) {

  var cache = this._cache = {};

  async function get(id) {
    var page = cache[id];

    if (!page) {
      page = cache[id] = await druck.loadFile(id);
    }

    return page;
  }

  async function all(pattern) {
    const files = await glob(pattern, { cwd: druck.config.source, filesOnly: true });

    return Promise.all(files.map(get));
  }

  all.get = get;

  return all;
};