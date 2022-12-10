const pkg = require('../../package.json');

const { join, dirname } = require('node:path');

const { spawnSync } = require('node:child_process');


describe('cli', function() {

  it('should invoke cmd', function() {

    const binPath = require.resolve(join('../..', pkg.bin.kartoffeldruck));

    const cwd = dirname(require.resolve('../fixtures/empty/kartoffeldruck'));

    // when
    const result = spawnSync('node', [ binPath ], {
      cwd
    });

    // then
    expect(result.status).to.eql(0);
  });

});