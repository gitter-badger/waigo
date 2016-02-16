"use strict";

const util = require('util');

const waigo = global.waigo,
  _ = waigo._,
  viewObjects = waigo.load('support/viewObjects');



/**
 * Get renderable representation of this `Error`.
 *
 * Is is better to use `RuntimeError`-derived error classes instead of `Error` 
 * as they provide other useful features. However unexpected errors may occur 
 * which is why it is important to be able to process them for output.
 * 
 * @return {Object} Plain object.
 */
Error.prototype[viewObject.METHOD_NAME] = function*(ctx) {
  let ret = {
    type: this.name || 'Error',
    msg: this.message,
    details: null,
  };

  ret.details = this.details || this.failures;

  return ret;
};


/**
 * A runtime error.
 * 
 * Use this in preference to `Error` where possible as it provides for more 
 * descriptive output. 
 */
export class RuntimeError extends Error {
  /**
   * Constructor.
   *
   * @param {String} [msg] Error message.
   * @param {Number} [status] HTTP return status code to set. Default is 500.
   * @param {Object} [details] Additional details pertaining to this error.
   */
  constructor (msg = 'An error occurred', status = 500, details = null) {
    super(msg);
    this.name = this.constructor.name;
    this.message = msg;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}



/**
 * Get renderable representation of this error.
 *
 * @return {Object} Plain object.
 */
RuntimeError.prototype[viewObject.METHOD_NAME] = function*(ctx) {
  let ret = {
    type: this.name,
    msg: this.message,
  };

  if (this.details) {
    ret.details = yield viewObjects.toViewObjectYieldable(ctx, this.details);
  }

  return ret;
};





/**
 * Represents multiple errors grouped together.
 *
 * Sometimes we may wish to report multiple related errors (e.g. form field 
 * validation failures). This error class makes it easy to do so.
 */
export class MultipleError {
  /**
   * Constructor.
   *
   * @param {String} [msg] Error message.
   * @param {Number} [status] HTTP return status code to set. Default is 500.
   * @param {Object} [subErrors] Map of errors, where each value is itself an `Error` instance.
   */
  construct (msg = 'Some errors occurred', status = 500, subErrors = {}) {
    super(msg, status, subErrors);
  }
}



/**
 * Get renderable representation of this error.
 *
 * This collects view object representations of all the sub-errors and into a 
 * single object.
 *
 * @return {Object} Plain object.
 */
MultipleError.prototype[viewObject.METHOD_NAME] = function*(ctx) {
  let ret = {
    type: this.name,
    msg: this.message,
    details: {},
  };

  for (let subError of this.details) {
    let fn = subError[viewObject.METHOD_NAME];

    ret.details[id] = (fn ? yield fn(ctx) : subError);
  }

  return ret;
};





/**
 * Define a new error class.
 *
 * This is a convenience method for quickly creating custom error classes which 
 * inherit from existing classes. 
 *
 * @param {String} newClassName Name of this new error type.
 * @param {Class} [baseClass] Base class to derive the new class from. Default is `RuntimeError`.
 *
 * @return {Class} The new error class.
 */
exports.define = function(newClassName, baseClass = RuntimeError) {
  let newErrorClass = function() {
    (baseClass).apply(this, arguments);
    this.name = newClassName;
    Error.captureStackTrace(this, newErrorClass);
  };
  util.inherits(newErrorClass, baseClass);
  return newErrorClass;
};


