'use strict';

var Socket = require('socket.io-client')
  , connections = {}
  , connected = 0
  , received_msg = 0;

//
// Get the session document that is used to generate the data.
//
var session = require(process.argv[2]);

// 收集后一次性send给master
var metrics_datas = {collection:true, datas:[]};

var sendToMaster = setInterval(function () {
  process.send({ type: 'connected', connected: connected, received_msg: received_msg, worker_id: process.pid });
}, 60000);

process.on('message', function message(task) {
  var now = Date.now();
  
  //
  // Shut down every single socket.
  //
  if (task.shutdown) {
    console.log('shutdown', process.pid);
    Object.keys(connections).forEach(function shutdown(id) {
      connections[id] && connections[id].disconnect();
    });

    setInterval(function(){
      if (connected <= 0) {
        clearInterval(sendToMaster);
        // 一次性发送
        process.send(metrics_datas, null, function(err){
          metrics_datas.datas = [];
          process.exit();
        });
      };
    }, 30000);
  }

  // End of the line, we are gonna start generating new connections.
  if (!task.url) return;

  var sock_opts = {
    forceNew:true,
    transports:['websocket']
  };

  if (task.localaddr) {
    sock_opts.localAddress = task.localaddr;
  };
  var socket = new Socket(task.url, sock_opts);
  socket.last = Date.now();

  socket.on('connect', function open() {
    connected ++;
    // console.info(task.id + " opened", connections);
    var send_data = { type: 'open', duration: Date.now() - now, id: task.id };
    // process.send(send_data);
    metrics_datas.datas.push(send_data);
    // write(socket, task, task.id);
    // 
    if (task.send_opened) {
      process.send({ type: 'opened', duration: Date.now() - now, id: task.id });
    };
    /*if (connected % 1000 === 0) {
      console.info('worker ', process.pid, ' has connection: ', connected);
    };*/
    
    // As the `close` event is fired after the internal `_socket` is cleaned up
    // we need to do some hacky shit in order to tack the bytes send.
  });

  function message(data) {
    var send_data = {
      type: 'message', latency: Date.now() - socket.last,
      id: task.id
    };
    // process.send(send_data);
    metrics_datas.datas.push(send_data);

    received_msg++;
    // console.log('['+task.id.substr(task.id.indexOf('::'))+']socket on message@'+socket.last, "\n", data, "\n");
    // Only write as long as we are allowed to send messages
    if (--task.messages && task.messages > 0) {
      write(socket, task, task.id);
    } else {
      // socket.disconnect();
    }
  };
  socket.on('message', message);
  socket.on('onMessage', message);

  socket.on('disconnect', function close() {
    connected--;
    var internal = {};
    // console.log(socket);
    // var internal = socket.io.engine._socket || {};
    // console.info('['+task.id+']socket on close');

    var send_data = {
      type: 'close', id: task.id,
      read: internal.bytesRead || 0,
      send: internal.bytesWritten || 0
    };
    // process.send(send_data);
    metrics_datas.datas.push(send_data);

    delete connections[task.id];
    // console.log('close ', Object.keys(connections).length);
    if (Object.keys(connections) <= 0) {
      clearInterval(sendToMaster);
      // 一次性发送
      process.send(metrics_datas);
      metrics_datas.datas = [];
    };
  });

  socket.on('error', function error(err) {
    console.error('['+task.id+']socket on error-------', "\n", err, "\n", '-------error');
    var send_data = { type: 'error', message: err.message, id: task.id };
    // process.send(send_data);
    metrics_datas.datas.push(send_data);

    socket.disconnect();
    socket.emit('disconnect');
    delete connections[task.id];
  });

  // Adding a new socket to our socket collection.
  connections[task.id] = socket;

  // timeout to close socket
  if (task.runtime && task.runtime > 0) {
    setTimeout(function timeoutToCloseSocket(id, socket) {
      // console.log('timeout to close socket:'+id);
      socket.disconnect();
    }, task.runtime * 1000, task.id, socket);
  }
});

process.on('SIGINT', function () {
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
  socket.send(task.size, function (err) {
      if (err) {
        var send_data = { type: 'error', message: err.message };
        // process.send(send_data);
        metrics_datas.datas.push(send_data);

        socket.disconnect();
        delete connections[id];
      }

      if (fn) fn(err);
    });

}
