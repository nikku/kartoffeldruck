var assign = require('lodash/assign');

function Page(id, name, attributes, body) {

  this.id = id;
  this.name = name;

  this.body = body;

  assign(this, attributes);
}

module.exports = Page;