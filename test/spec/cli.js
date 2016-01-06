var path = require('path');

var Kartoffeldruck = require('../../');


describe('cli', function() {

  describe('Kartoffeldruck#run', function() {

    it('should return druck instance', function() {

      // when
      var druck = Kartoffeldruck.run({ cwd: path.resolve('test/fixtures/empty') });

      // then
      expect(druck instanceof Kartoffeldruck).to.be.true;
    });


    it('should fail on broken kartoffeldruck.js', function() {

      // when
      var init = function() {
        Kartoffeldruck.run({
          cwd: path.resolve('test/fixtures/broken-config'),
          logger: console
        });
      };

      // then
      expect(init).to.throw(/failed to parse kartoffeldruck.js runner in/);
    });

  });

});