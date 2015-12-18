var path = require('path');

var GeneratorMock = require('../mock/generator');

var Kartoffeldruck = require('../../');


describe('kartoffeldruck', function() {

  describe('#run', function() {

    it('should fail on broken kartoffeldruck.js', function() {

      var druck, generator;

      generator = new GeneratorMock();

      // when
      var init = function() {
        Kartoffeldruck.run({
          cwd: path.resolve('test/fixtures/broken-config'),
          generator: generator,
          logger: console
        });
      };

      // then
      expect(init).to.throw(/could not parse kartoffeldruck.js runner in/);
    });

  });

});