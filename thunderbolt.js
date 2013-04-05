'use strict';

var Socket = require('ws')
  , collection = [];

//
// Get the session document that is used to generate the data.
//
var session = require(process.argv[2]);

process.on('message', function message(task) {
  var now = Date.now();

  //
  // Write a new message to the socket. The message should have a size of x
  //
  if ('write' in task) collection.forEach(function write(socket) {
    write(socket, task);
  });

  //
  // Shut down every single socket.
  //
  if (task.shutdown) collection.forEach(function shutdown(socket) {
    socket.close();
  });

  // End of the line, we are gonna start generating new connections.
  if (!task.url) return;

  var socket = new Socket(task.url);

  socket.on('open', function open() {
    process.send({ type: 'open', duration: Date.now() - now, id: task.id });
    write(socket, task);
  });

  socket.on('message', function message(data) {
    process.send({
      type: 'message', latency: Date.now() - socket.last,
      length: Buffer.byteLength(data || ''),
      id: task.id
    });

    // Only write as long as we are allowed to send messages
    if (--task.messages) write(socket, task);
  });

  socket.on('close', function close() {
    process.send({ type: 'close', id: task.id });
  });

  socket.on('error', function error(err) {
    process.send({ type: 'error', message: err.message, id: task.id });
  });

  // Adding a new socket to our socket collection.
  collection.push(socket);
});

/**
 * Helper function from writing messages to the socket.
 *
 * @param {WebSocket} socket WebSocket connection we should write to
 * @param {Object} task The given task
 * @param {Function} fn The callback
 * @api private
 */
function write(socket, task, fn) {
  var start = socket.last = Date.now();

  session[task.method || 'utf8'](task.size, function message(err, data) {
    socket.send(data, function sending(err) {
      if (err) process.send({ type: 'error', message: err.message });
      if (fn) fn(err);
    });
  });
}
