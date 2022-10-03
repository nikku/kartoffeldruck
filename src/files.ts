import glob from 'tiny-glob';

import Page from './page';


export type Files = {
  (pattern: string): Promise<Page[]>;

  get: (id: string) => Promise<Page>
};

export function createFiles(druck) : Files {

  const cache : Record<string, Page> = {};

  async function get(id: string) : Promise<Page> {
    let page = cache[id];

    if (!page) {
      page = cache[id] = await druck.loadFile(id);
    }

    return page;
  }

  async function all(pattern: string) : Promise<Page[]> {
    const files = await glob(pattern, { cwd: druck.config.source, filesOnly: true });

    return Promise.all(files.map(get));
  }

  all.get = get;
  all.cache = cache;

  return all;
}