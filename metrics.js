'use strict';

function Metrics(requests) {
  this.requests = requests;

  this.connections = 0;
  this.disconnects = 0;

  this.errors = Object.create(null);
  this.timing = Object.create(null);
}

/**
 * The metrics has started collecting.
 *
 * @api private
 */
Metrics.prototype.start = function start() {
  this.timing.start = Date.now();
  return this;
};

/**
 * The metrics has stopped collecting.
 *
 * @api private
 */
Metrics.prototype.stop = function stop() {
  this.timing.stop = Date.now();
  this.timing.duration = this.timing.stop - this.timing.start;
  return this;
};

Metrics.prototype.ready = function open() {
  this.timing.ready = Date.now();
  this.timing.handshaken = this.timing.ready - this.timing.start;
};

/**
 * Log an new error.
 *
 * @param {String} err Error message
 * @api private
 */
Metrics.prototype.error = function error(err) {
  if (!err) return this.errors;

  var collection = this.errors[err];
  if (!collection) this.errors[err] = 1;
  else this.errors[err]++;

  return this;
};

//
// Expose the metrics constructor.
//
module.exports = Metrics;
