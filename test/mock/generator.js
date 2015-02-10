function Generator() {

  this._generated = [];

  this.generate = function(options) {
    this._generated.push(options);
  };
}

module.exports = Generator;