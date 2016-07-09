'use strict';

var Socket = require('socket.io-client')
  , connections = {}
  , concurrent = 0;

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

// collect metics datas
var metrics_datas = {collection:true, datas:[]}
  , statInterval = +process.argv[6] || 60
  , logError = +process.argv[7] || 0
  , process_send = function(data, task) {
      if (statInterval <= 0 || ('open' == data.type && task.nextTask)) {
        process.send(data);
      }else{
        metrics_datas.datas.push(data);
      }
    }
  , process_sendAll = function(end) {
      if (metrics_datas.datas.length <= 0) {
        return;
      };
      // send all data to parent
      process.send(metrics_datas, null, function clearDatas(err){
        // invoked after the message is sent but before the target may have received it
        if (err) {return;}
        // WARNING: maybe we should use synchronize method here
        metrics_datas.datas = [];
        if (end) {
          process.exit();
        };
      });
    }
  , checkConnectionLength = function(){
      if (Object.keys(connections).length <= 0) {
        process_sendAll(true);
      }
    }
  , workerStatInterval = setInterval(function () {
      process_sendAll();
    }, statInterval * 1000);

process.on('message', function message(task) {
  var start_timestamp = Date.now();

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
      connections[id] && connections[id].disconnect();
    });
  }

  // End of the line, we are gonna start generating new connections.
  if (!task.url) return;

  var socket = new Socket(task.url, {
    'force new connection': true,
    reconnection: false,
    timeout: task.connectTimeout * 1000,
    transports: task.transport,
    protocolVersion: protocol,
    localAddress: task.localaddr || null,
    headers: {'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36'}
  });
  socket.last = Date.now();
  var pingInterval = null;

  socket.on('connect', function open() {
    process_send({ type: 'open', duration: Date.now() - start_timestamp, id: task.id, concurrent: concurrent, cur_time: Date.now(), wid: process.pid }, task);
    // write(socket, task, task.id);

    // As the `close` event is fired after the internal `_socket` is cleaned up
    // we need to do some hacky shit in order to tack the bytes send.
  });

  socket.on(process.env.NODE_ON_MESSAGE?process.env.NODE_ON_MESSAGE:'message', function message(data) {
    process_send({
      type: 'message', latency: Date.now() - socket.last,
      id: task.id, wid: process.pid
    }, task);

    // Only write as long as we are allowed to send messages
    if (task.messages > 0)
    if (--task.messages) {
      write(socket, task, task.id);
    } else {
      socket.disconnect();
      socket.emit('disconnect');
    }
  });

  socket.on('disconnect', function close(msg) {
    var err = msg=='error' && arguments.length > 2 ? Array.prototype.slice.call(arguments, 1, 2).pop() : null;
    if (err && logError) {
      console.error(err);
    }

    var internal = {};
    try{
      internal = socket.io.engine.transport.ws._socket || {};
    }catch(e){
      // console.log(socket.io.engine.transport.pollXhr);
    }

    process_send({
      type: 'close', id: task.id, wid: process.pid, concurrent: --concurrent, cur_time: Date.now(),
      read: internal.bytesRead || 0,
      send: internal.bytesWritten || 0
    }, task);

    delete connections[task.id];
    clearInterval(pingInterval);
    checkConnectionLength();
  });

  socket.on('error', function error(err) {
    process_send({ type: 'error', message: err.description ? err.description.message : (err.message?err.message:err), id: task.id, wid: process.pid }, task);

    socket.disconnect('error', err);
    socket.emit('disconnect', 'error', err);
    delete connections[task.id];
    checkConnectionLength();
  });

  // catch ECONNREFUSED
  socket.io.on('connect_error', function connect_error(err){
    process_send({ type: 'error', message: err.description ? err.description.message : (err.message?err.message:err), id: task.id, wid: process.pid }, task);

    socket.disconnect('error', err);
    socket.emit('disconnect', 'error', err);
    delete connections[task.id];
    checkConnectionLength();
  });

  // Adding a new socket to our socket collection.
  ++concurrent;
  connections[task.id] = socket;

  // timeout to close socket
  if (task.runtime && task.runtime > 0) {
    setTimeout(function timeoutToCloseSocket(id, socket) {
      socket.disconnect();
      socket.emit('disconnect');
    }, task.runtime * 1000, task.id, socket);
  }
});

process.on('SIGINT', function () {});
process.on('exit', function () {});

/**
 * Helper function from writing messages to the socket.
 *
 * @param {WebSocket} socket WebSocket connection we should write to
 * @param {Object} task The given task
 * @param {String} id
 * @param {Function} fn The callback
 * @param {String} data
 * @api private
 */
function write(socket, task, id, fn, data) {
  // i thank the generator doesn't make any sense, but just let me do some change and leave it alone
  session[binary ? 'binary' : 'utf8'](data || task.size, function message(err, data) {
    var start = socket.last = Date.now();

    socket.send(data, {
      binary: binary,
      mask: masked
    }, function sending(err) {
      if (err) {
        process_send({ type: 'error', message: err.description ? err.description.message : (err.message?err.message:err), id: task.id, wid: process.pid }, task);

        socket.disconnect('error', err);
        socket.emit('disconnect', 'error', err);
        delete connections[id];
      }

      if (fn) fn(err);
    });
  });
}
