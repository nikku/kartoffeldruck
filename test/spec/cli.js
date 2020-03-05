var path = require('path');

var Kartoffeldruck = require('../../');


describe('cli', function() {

  describe('Kartoffeldruck#run', function() {

    it('should return druck instance', async function() {

      // when
      var druck = await Kartoffeldruck.run({
        cwd: path.resolve('test/fixtures/empty')
      });

      // then
      expect(druck instanceof Kartoffeldruck).to.be.true;
    });


    describe('error handling', function() {

      it('should handle broken runner', async function() {

        // given
        let err;

        // when
        try {
          await Kartoffeldruck.run({
            cwd: path.resolve('test/fixtures/broken-config'),
            logger: console
          });
        } catch (e) {
          err = e;
        }

        // then
        expect(err).to.exist;

        expect(err.message).to.match(/failed to load </);
      });


      it('should handle failing runner', async function() {

        // given
        let err;

        // when
        try {
          await Kartoffeldruck.run({
            cwd: path.resolve('test/fixtures/failing-runner'),
            logger: console
          });
        } catch (e) {
          err = e;
        }

        // then
        expect(err).to.exist;

        expect(err.message).to.match(/failed to execute </);
      });

    });

  });

});