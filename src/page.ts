const {
  assign
} = require('min-dash');


export default class Page {

  id: string;
  name: string;
  body: string;
  [name: string]: any;

  constructor(
    id: string,
    name: string,
    attributes: Record<string, any>,
    body: string
  ) {

    this.id = id;
    this.name = name;
    this.body = body;

    assign(this, attributes);
  }

}