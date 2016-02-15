function Generator() {

  this._generated = [];

  this.generate = function(options) {
    this._generated.push(options);
    return 'rendered';
  };
}

module.exports = Generator;
