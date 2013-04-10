(function () {
  "use strict";

  var net = require('net');

  function connect(options) {

    var node = {},
      state,
      client,
      updated,
      updateCallback = function () { return; };

    function parseBabel(line) {
      var tokens = line.split(' '), i;

      switch (tokens[0]) {
      case 'add':
        /* self is special: it contains no key */
        if (tokens[1] === "self") {
          if (typeof state.self.name !== "undefined") {
            console.error("Duplicate self");
            return false;
          }
          state.self = { name: tokens[2], id: tokens[4] };
          updated = true;
          break;
        }
        /* every other kind of add now */
        if (typeof state[tokens[1]][tokens[2]] === "undefined") {
          state[tokens[1]][tokens[2]] = {};
        } else {
          console.error("Adding a known " + tokens[1] + ": " + tokens[2]);
          return false;
        }
        for (i = 3; i < tokens.length; i += 2) {
          state[tokens[1]][tokens[2]][tokens[i]] = tokens[i + 1];
        }
        updated = true;
        break;
      case 'change':
        if (typeof state[tokens[1]][tokens[2]] === "undefined") {
          console.error("Changing a missing " + tokens[1] + ": " + tokens[2]);
          return false;
        }
        for (i = 3; i < tokens.length; i += 2) {
          if(state[tokens[1]][tokens[2]][tokens[i]] === tokens[i + 1]) {
            continue;
          }
          state[tokens[1]][tokens[2]][tokens[i]] = tokens[i + 1];
          updated = true;
        }
        break;
      case 'flush':
        if (typeof state[tokens[1]][tokens[2]] === "undefined") {
          console.error("Flushing a missing " + tokens[1] + ": " + tokens[2]);
          state[tokens[1]][tokens[2]] = {};
        } else {
          delete state[tokens[1]][tokens[2]];
        }
        updated = true;
        break;
      case 'BABEL':
        if (tokens[1] !== '0.0') {
          console.error('Unknown protocol version: ' + tokens[1]);
          process.exit(1);
        }
        break;
       case 'done': break;
      default:
        console.error('Ignoring unknown token: ' + tokens[0]);
      }
      return true;
    }

    function babelConnect() {

      state = {
        "self": {},
        "neighbour": {},
        "xroute": {},
        "route": {},
      };
      updated = true;
      /* Store the rest of Babel input, after the latest newline */
      var buffer = '';

      client = net.connect({port: options.port, host: options.address},
          function () { console.log("Connected to Babel."); });
      client.setEncoding('ascii');
      client.setKeepAlive(true);

      client.on('data', function (data) {
        var lines = buffer.concat(data).split('\n'), i;
        buffer = lines.pop();
        for (i = 0; i < lines.length; i = i + 1) {
          if (!parseBabel(lines[i])) {
            console.error("Parse error: reconnecting.");
            console.error(JSON.stringify(state));
            /* This will trigger a 'close' event, which reconnects */
            client.destroy();
            return;
          }
        }
        if(updated) { updateCallback(node); }
        updated = false;
      });

      client.on('close', function (error) {
        if (error) { return; /* already handled */ }
        console.error("Babel socket close: reconnecting in 1 second.");
        setTimeout(babelConnect, 1000);
      });

      client.on('error', function () {
        console.error("Babel socket error: reconnecting in 1 second.");
        setTimeout(babelConnect, 1000);
      });

    }

    function start() {
      if (typeof client === "undefined") {
        babelConnect();
      } else {
        /* Trigger a reconnection */
        client.destroy();
      }
    }
    node.start = start;

    function getState() {
      return state;
    }
    node.getState = getState;

    function on(e, f) {
      if (e === "update") {
        updateCallback = f;
      }
    }
    node.on = on;

    return node;

  }

  module.exports.connect = connect;

}());
