'use strict';

var Socket = require('ws')
  , connections = {};

//
// Get the session document that is used to generate the data.
//
var session = require(process.argv[2]);

//
// WebSocket connection details.
//
var masked = process.argv[4] === 'true'
  , binary = process.argv[5] === 'true'
  , protocol = +process.argv[3] || 13;

process.on('message', function message(task) {
  var now = Date.now();

  //
  // Write a new message to the socket. The message should have a size of x
  //
  if ('write' in task) {
    Object.keys(connections).forEach(function write(id) {
      write(connections[id], task, id);
    });
  }

  //
  // Shut down every single socket.
  //
  if (task.shutdown) {
    Object.keys(connections).forEach(function shutdown(id) {
      connections[id].close();
    });
  }

  // End of the line, we are gonna start generating new connections.
  if (!task.url) return;

  var socket = new Socket(task.url, {
    protocolVersion: protocol
  });

  socket.on('open', function open() {
    process.send({ type: 'open', duration: Date.now() - now, id: task.id });
    write(socket, task, task.id);

    // As the `close` event is fired after the internal `_socket` is cleaned up
    // we need to do some hacky shit in order to tack the bytes send.
  });

  socket.on('message', function message(data) {
    process.send({
      type: 'message', latency: Date.now() - socket.last,
      id: task.id
    });

    // Only write as long as we are allowed to send messages
    if (--task.messages) write(socket, task, task.id);
  });

  socket.on('close', function close() {
    process.send({
      type: 'close', id: task.id,
      read: socket._socket.bytesRead,
      send: socket._socket.bytesWritten
    });
  });

  socket.on('error', function error(err) {
    process.send({ type: 'error', message: err.message, id: task.id });

    socket.close();
    delete connections[task.id];
  });

  // Adding a new socket to our socket collection.
  connections[task.id] = socket;
});

/**
 * Helper function from writing messages to the socket.
 *
 * @param {WebSocket} socket WebSocket connection we should write to
 * @param {Object} task The given task
 * @param {String} id
 * @param {Function} fn The callback
 * @api private
 */
function write(socket, task, id, fn) {
  var start = socket.last = Date.now();

  session[binary ? 'binary' : 'utf8'](task.size, function message(err, data) {
    socket.send(data, {
      binary: binary,
      mask: masked
    }, function sending(err) {
      if (err) {
        process.send({ type: 'error', message: err.message });

        socket.close();
        delete connections[id];
      }

      if (fn) fn(err);
    });
  });
}
