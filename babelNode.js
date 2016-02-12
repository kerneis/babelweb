(function () {
  "use strict";

  var net = require('net');

  function connect(options) {

    var node = {},
      protocolVersion = 0,
      state,
      client,
      updated,
      connectionFailure = false, /* Avoid spamming log with repeated failures */
      updateCallback = function () { return; },
      closeCallback = function () { return; };

    function parseBabel(client, line) {
      var tokens = line.split(/\s+/), i;

      switch (tokens[0]) {
      case 'add':
        /* self is special: it contains no key */
        if (tokens[1] === "self") {
          if (protocolVersion > 0) {
            log("error", "self in version 1");
            return false;
          }
          if (typeof state.self.name !== "undefined") {
            log("error", "Duplicate self");
            return false;
          }
          state.self.name = tokens[2];
          state.self.id = tokens[4];
          updated = true;
          break;
        }
        /* every other kind of add now */
        if (typeof state[tokens[1]][tokens[2]] === "undefined") {
          state[tokens[1]][tokens[2]] = {};
        } else {
          log("error", "Adding a known " + tokens[1] + ": " + tokens[2]);
          return false;
        }
        for (i = 3; i < tokens.length; i += 2) {
          state[tokens[1]][tokens[2]][tokens[i]] = tokens[i + 1];
        }
        updated = true;
        break;
      case 'change':
        if (typeof state[tokens[1]][tokens[2]] === "undefined") {
          log("error", "Changing a missing " + tokens[1] + ": " + tokens[2]);
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
          log("error", "Flushing a missing " + tokens[1] + ": " + tokens[2]);
          state[tokens[1]][tokens[2]] = {};
        } else {
          delete state[tokens[1]][tokens[2]];
        }
        updated = true;
        break;
      case 'version':
        if (typeof state.self.id !== "undefined") {
          log("error", "Duplicate version");
          return false;
        }
        state.self.version = tokens[1];
        updated = true;
        break;
      case 'host':
        if (protocolVersion === 0) {
          log("error", "Unexpected 'host' token in version 0.");
          return false;
        }
        if (typeof state.self.name !== "undefined") {
          log("error", "Duplicate host");
          return false;
        }
        state.self.name = tokens[1];
        updated = true;
        break;
      case 'my-id':
        if (protocolVersion === 0) {
          log("error", "Unexpected 'my-id' token in version 0.");
          return false;
        }
        if (typeof state.self.id !== "undefined") {
          log("error", "Duplicate my-id");
          return false;
        }
        state.self.id = tokens[1];
        updated = true;
        break;
      case 'BABEL':
        if (tokens[1].match('^0\.')) {
          protocolVersion = 0;
        } else if (tokens[1].match('^1\.')) {
          protocolVersion = 1;
          client.write("monitor\n");
        } else {
          log("error", 'Unknown protocol version: ' + tokens[1]);
          process.exit(1);
        }
        break;
      case 'ok':
      case 'done':
        break;
      default:
        log("error", 'Ignoring unknown token: ' + tokens[0]);
      }
      return true;
    }

    function babelConnect() {

      state = {
        "self": {},
        "interface": {},
        "neighbour": {},
        "xroute": {},
        "route": {},
      };
      updated = true;
      /* Store the rest of Babel input, after the latest newline */
      var buffer = '';

      client = net.connect({port: options.port, host: options.host},
          function () {
            connectionFailure = false;
            log("normal", "Connected to Babel.");
          });
      client.setEncoding('ascii');
      client.setKeepAlive(true);

      client.on('data', function (data) {
        var lines = buffer.concat(data).split('\n'), i;
        buffer = lines.pop();
        for (i = 0; i < lines.length; i = i + 1) {
          if (!parseBabel(client, lines[i])) {
            log("error", "Parse error: reconnecting.");
            log("error", JSON.stringify(state));
            /* This will trigger a 'close' event, which reconnects */
            client.destroy();
            return;
          }
        }
        if(updated) { updateCallback(node); }
        updated = false;
      });

      client.on('close', function (error) {
        /* Call close callback only if we know the router-id already. */
        if(typeof state.self.id !== "undefined") {
          closeCallback(node, state.self.id);
        }
        if(!connectionFailure) {
          log("error", "Babel socket close: reconnecting in 1 second.");
        }
        connectionFailure = true;
        setTimeout(babelConnect, 1000);
      });

      client.on('error', function () {
        /* Do nothing, 'close' will be called in any case.
         * http://nodejs.org/api/net.html#net_event_error_1
         */
        return;
      });

    }

    function log(type, msg) {
      var logmsg = "[" + options.host + "]:" + options.port + " - " + msg;
      if(type === "error") {
        console.error(logmsg);
      } else {
        console.log(logmsg);
      }
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

    /* Return the state of the node, or null if we don't have enough
     * information */
    function getState() {
      if(typeof state.self.id === "undefined") {
        return null;
      } else {
        return state;
      }
    }
    node.getState = getState;

    function on(e, f) {
      if (e === "update") {
        updateCallback = f;
      }
      if (e === "close") {
        closeCallback = f;
      }
    }
    node.on = on;

    return node;

  }

  module.exports.connect = connect;

}());
