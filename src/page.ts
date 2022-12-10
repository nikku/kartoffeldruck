import {
  assign
} from 'min-dash';


export default class Page {

  id: string;
  name: string;
  context: string;
  body: string;
  [name: string]: any;

  constructor(
      id: string,
      attributes: Record<string, any>,
      body: string
  ) {

    this.id = id;
    this.name = id.replace(/\.[^.]+$/, '');
    this.context = id.replace(/((^|\/)index)?\.[^.]+$/, '');
    this.body = body;

    assign(this, attributes);
  }

}