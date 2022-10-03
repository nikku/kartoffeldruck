export type Logger = {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

/**
 * @constructor
 */
export function NopLogger() {

  this.info =
  this.error =
  this.debug =
  this.log = function() {

    // noop
  };
}