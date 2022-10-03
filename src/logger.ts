/**
 * @constructor
 */
export function NopLogger() {
  this.info = this.error = this.debug = this.log = function() {};
}