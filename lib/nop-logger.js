'use strict';

function NopLogger() {
  this.info = this.error = this.debug = this.log = function() {};
}

module.exports = NopLogger;