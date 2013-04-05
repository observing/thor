'use strict';

function Metrics(requests) {
  this.requests = requests;             // The total amount of requests send

  this.connections = 0;                 // Connections established
  this.disconnects = 0;                 // Closed connections
  this.failures = 0;                    // Connections that received an error

  this.errors = Object.create(null);    // Collection of different errors
  this.timing = Object.create(null);    // Different timings

  this.latency = [];                    // Latencies of the echo'd messages
  this.handshaking = [];                // Handshake duration

  this.read = 0;                        // Bytes read
  this.send = 0;                        // Bytes send
}

/**
 * The metrics has started collecting.
 *
 * @api public
 */
Metrics.prototype.start = function start() {
  this.timing.start = Date.now();
  return this;
};

/**
 * The metrics has stopped collecting.
 *
 * @api public
 */
Metrics.prototype.stop = function stop() {
  this.timing.stop = Date.now();
  this.timing.duration = this.timing.stop - this.timing.start;
  return this;
};

/**
 * All the connections are established
 *
 * @api public
 */
Metrics.prototype.established = function established() {
  this.timing.ready = Date.now();
  this.timing.established = this.timing.ready - this.timing.start;
};

/**
 * Log an new error.
 *
 * @param {Object} data The error
 * @api public
 */
Metrics.prototype.error = function error(data) {
  this.failures++;

  var collection = this.errors[data.message];
  if (!collection) this.errors[data.message] = 1;
  else this.errors[data.message]++;

  return this;
};

/**
 * Register a message resposne.
 *
 * @param {Object} data The message details.
 * @api public
 */
Metrics.prototype.message = function message(data) {
  this.latency.push(data.latency);

  return this;
};

/**
 * Register a successful handshake + open.
 *
 * @param {Object} data Handshake details.
 * @api public
 */
Metrics.prototype.handshaken = function handshaken(data) {
  this.connections++;
  this.handshaking.push(data.duration);

  return this;
};

/**
 * The connection has closed.
 *
 * @param {Object} data Close information
 * @api public
 */
Metrics.prototype.close = function close(data) {
  this.disconnections++;
  this.read += data.read;
  this.send += data.send;

  return this;
};

/**
 * Generate a summary of the metrics.
 *
 * @api public
 */
Metrics.prototype.summary = function summary() {
};

//
// Expose the metrics constructor.
//
module.exports = Metrics;
