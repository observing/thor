'use strict';

var Socket = require('ws')
  , collection = [];

process.on('message', function message(task) {
  //
  // Write a new message to the socket. The message should have a size of x
  //
  if ('write' in task) collection.forEach(function write(socket) {
    var start = Date.now();

    socket.send(task.message, function sending(err) {
      var duration = Date.now() - start;

    });
  });

  if (task.shutdown) collection.forEach(function shutdown(socket) {
    socket.close();
  });
});
