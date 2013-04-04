'use strict';

var Socket = require('ws')
  , collection = [];

process.on('message', function message(task) {
  var now = Date.now();

  //
  // Write a new message to the socket. The message should have a size of x
  //
  if ('write' in task) collection.forEach(function write(socket) {
    var start = socket.last = now;

    socket.send(task.message, function sending(err) {
      if (err) process.send({ type: 'error', message: err.message });
    });
  });

  if (task.shutdown) collection.forEach(function shutdown(socket) {
    socket.close();
  });

  // End of the line, we are gonna start generating new connections.
  if (!task.url) return;

  var socket = new Socket(task.url);

  socket.on('open', function open() {
    process.send({ type: 'open', duration: Date.now() - now });
  });

  socket.on('message', function message(data) {
    process.send({ type: 'message', latency: Date.now() - socket.last });
  });

  socket.on('close', function close() {
    process.send({ type: 'close' });
  });

  socket.on('error', function error(err) {
    process.send({ type: 'error', message: err.message });
  });

  // Adding a new socket to our socket collection.
  collection.push(socket);
});
