'use strict';

var Stats = require('fast-stats').Stats
  , colors = require('colors')
  , sugar = require('sugar')
  , table = require('tab');

/**
 * Metrics collection and generation.
 *
 * @constructor
 * @param {Number} requests The total amount of requests scheduled to be send
 */
function Metrics(requests) {
  this.requests = requests;             // The total amount of requests send

  this.connections = 0;                 // Connections established
  this.disconnects = 0;                 // Closed connections
  this.failures = 0;                    // Connections that received an error

  this.errors = Object.create(null);    // Collection of different errors
  this.timing = Object.create(null);    // Different timings

  this.latency = new Stats();           // Latencies of the echo'd messages
  this.handshaking = new Stats();       // Handshake duration

  this.read = 0;                        // Bytes read
  this.send = 0;                        // Bytes send

  // Start tracking
  this.start();
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
  if (this.timing.stop) return this;

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
  if (this.timing.established) return this;

  this.timing.ready = Date.now();
  this.timing.established = this.timing.ready - this.timing.start;
  return this;
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
 * @returns {Object} The summary
 * @api public
 */
Metrics.prototype.summary = function summary() {
  var results = new table.TableOutputStream({ columns: [
    { label: '', width: 20 },
    { label: '' }
  ]});

  console.log();
  results.writeRow(['Online', this.timing.established + ' milliseconds']);
  results.writeRow(['Time taken', this.timing.duration + ' milliseconds']);
  results.writeRow(['Connected', this.connections]);
  results.writeRow(['Disconnected', this.disconnects]);
  results.writeRow(['Failed', this.failures]);

  results.writeRow(['Total transferred', this.send.bytes(2)]);
  results.writeRow(['Total received', this.read.bytes(2)]);

  // Up next is outputting the series.
  var handshaking = this.handshaking
    , latency = this.latency
    , hrange = handshaking.range()
    , lrange = latency.range();

  //
  // Generate the width of the columns, based on the length of the longest
  // number. If it's less then the max size of a label, we default to that.
  // After that we also pad the strings with 1 char for extra spacing.
  //
  var width = (lrange[1] > hrange[1] ? lrange[1] : hrange[1]).toString().length;
  if (width < 6) width = 6;
  width++;

  console.log();
  console.log('Durations (ms):');
  console.log();

  table.emitTable({
    columns: [
      { label: '', width: 20 },
      { label: 'min', width: width, align: 'left' },
      { label: 'mean', width: width, align: 'left' },
      { label: 'stddev', width: width, align: 'right' },
      { label: 'median', width: width, align: 'right' },
      { label: 'max', width: width, align: 'left' }
    ],
    rows: [
      [
        'Handshaking',
        hrange[0].toFixed(),
        handshaking.amean().toFixed(),
        handshaking.stddev().toFixed(),
        handshaking.median().toFixed(),
        hrange[1].toFixed()
      ],
      [
        'Latency',
        lrange[0].toFixed(),
        latency.amean().toFixed(),
        latency.stddev().toFixed(),
        latency.median().toFixed(),
        lrange[1].toFixed()
      ]
    ]
  });

  console.log();
  console.log('Percentile (ms):');
  console.log();

  table.emitTable({
    columns: [
      { label: '', width: 20 },
      { label: ' 50%', width: width },
      { label: ' 66%', width: width },
      { label: ' 75%', width: width },
      { label: ' 80%', width: width },
      { label: ' 90%', width: width },
      { label: ' 95%', width: width },
      { label: ' 98%', width: width },
      { label: ' 98%', width: width },
      { label: '100%', width: width },
    ],
    rows: [
      [
        'Handshaking',
        handshaking.percentile(50).toFixed(),
        handshaking.percentile(66).toFixed(),
        handshaking.percentile(75).toFixed(),
        handshaking.percentile(80).toFixed(),
        handshaking.percentile(90).toFixed(),
        handshaking.percentile(95).toFixed(),
        handshaking.percentile(98).toFixed(),
        handshaking.percentile(99).toFixed(),
        handshaking.percentile(100).toFixed()
      ],
      [
        'Latency',
        latency.percentile(50).toFixed(),
        latency.percentile(66).toFixed(),
        latency.percentile(75).toFixed(),
        latency.percentile(80).toFixed(),
        latency.percentile(90).toFixed(),
        latency.percentile(95).toFixed(),
        latency.percentile(98).toFixed(),
        latency.percentile(99).toFixed(),
        latency.percentile(100).toFixed()
      ]
    ]
  });

  //
  // Output more error information, there could be multiple causes on why we
  // failed to send a message.
  //
  if (this.failures) {
    console.log();
    console.log('Received errors:');
    console.log();

    Object.keys(this.errors).forEach(function error(err) {
      results.writeRow([this.errors[err] +'x', err]);
    }, this);
  }

  return this;
};

//
// Expose the metrics constructor.
//
module.exports = Metrics;
