import glob from 'tiny-glob';


export function createFiles(druck) {

  const cache = {};

  async function get(id) {
    let page = cache[id];

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
  all.cache = cache;

  return all;
}