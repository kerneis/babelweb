/* Copyright (C) 2011 by Gabriel Kerneis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

"use strict";

process.title = 'babelweb';

var config = {
    "host" : "::",
    "port" : "8080",
    "routers" : "[::1]:33123",
    "update" : "1000",
    "verbose": false
  };

var key;
for (key in config) {
  var value = process.env["npm_package_config_" + key];
  if (typeof value !== 'undefined' && value !== "") {
    console.log("npm config get babelweb:" + key + " = " + value);
    config[key] = value;
  }
}

process.argv.forEach(function (val, index, array) {
  if (index >= 2) {
    var t = val.split('=');
    if (t.length === 2 && typeof config[t[0]] !== 'undefined') {
      config[t[0]] = t[1];
    } else {
      console.error("Warning: couldn't parse option " + val);
    }
  }
});


/* Setup connect */
var babelNode = require('./babelNode');
var url = require('url');
var routers =
  config.routers.split(',').map(function(r) {
    var u = url.parse("ip:" + r);
    return babelNode.connect({port: u.port, host: u.hostname});
  });

function handleUpdate(router) {
  router.hasChanged = true;
}

function handleClose(router, id) {
  var m = {
    "type": "delete",
    "id": id
  };
  io.sockets.json.send(m);
}

routers.forEach(function (r) {
  r.on("update", handleUpdate);
  r.on("close", handleClose);
  r.hasChanged = false;
  r.start();
});

/* Serving the results */

var connect = require('connect'),
  http = require('http'),
  app = connect().use(connect.static(__dirname + '/static')),
  server = http.createServer(app),
  io = require('socket.io').listen(server);

if (config.verbose) { app.use(connect.logger('dev')); } // XXX

server.listen(config.port, config.host);

io.configure(function () {
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.set('log level', config.verbose ? 3 : 1);

  io.set('transports', [
    'websocket',
    // disabled by default
    'flashsocket',
    'htmlfile',
    'xhr-polling',
    'jsonp-polling'
  ]);
});

/* Send updates to clients when they connect */

io.sockets.on('connection', function (client) {
  var states = [];
  routers.forEach(function (r) {
    var s = r.getState();
    if (s !== null) {
      states.push(s);
    }
  });
  if (states.length > 0) {
    client.json.send({"type":"update", "update":states});
  }
});

function timedUpdate() {
  var m = {
    "type": "update",
    "update": []
  };
  routers.forEach(function (r) {
    if (r.hasChanged) {
      var s = r.getState();
      if (s === null) {
        console.log("Router has changed but state is null!");
      } else {
        m.update.push(s);
      }
      r.hasChanged = false;
    }
  });
  if (m.update.length > 0) {
    io.sockets.volatile.json.send(m);
  }
  setTimeout(timedUpdate, config.update);
}

timedUpdate();

/* Handle signals */
process.on("SIGUSR2", function () {
  routers.forEach(function (r) { r.start(); });
});
process.on("SIGUSR1", function () {
  routers.forEach(function (r) { console.log(r.getState()); });
});

