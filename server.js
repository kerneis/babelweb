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

var config = {
    "serverAddress" : "::"       /* Local address to listen on */
  , "serverPort" : "8080"        /* Local port to listen on */
  , "babelAddress" : "::1"       /* Babel interface address */
  , "babelPort" : "33123"        /* Babel interface port */
  , "updateIval": 3000           /* Time between two updates (ms) */
  , "verbose": false             /* Print every message received from Babel nodes */
  , "user": ""                    /* Drop priviledges to this user */
};

for(key in config) {
    var value = process.env["npm_package_config_"+key];
    if(typeof value != 'undefined' && value != "") {
        console.log("npm config get babelweb:"+key+" = "+value);
        config[key] = value;
    }
}

process.argv.forEach(function (val, index, array) {
    if(index >= 2) {
        var t = val.split('=');
        if(t.length == 2 && typeof config[t[0]] != 'undefined') {
            config[t[0]] = t[1];
        } else {
            console.error("Warning: couldn't parse option "+val);
        }
    }
});

var babel = {};
var needUpdate = false;

if(process.getuid() == 0 && config.uid == "") {
    console.error("Refusing to run as root.  Set the \"user\" option, please.");
    process.exit(1);
}

/* Serving the results */

var http = require('http');
var net = require('net');

var connect = require('connect');
var server = connect.createServer(connect.static(__dirname + '/static'));
if(config.verbose)
        server.use(connect.logger());
server.listen(config.serverPort, config.serverAddress);

/* Needs to be root to enable Flash policy server on port 843 */
var io = require('socket.io').listen(server);

io.configure(function(){
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.set('log level', config.verbose ? 3 : 1);

  io.set('transports', [
    'websocket'
  , 'flashsocket' // disabled by default
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);
});

if(config.user != "") {
    try {
        process.setuid(config.user);
        console.error("Dropped priviledges.");
    }
    catch(err) {
        console.error("Failed to drop priviledges. Error: [%s] Call: [%s]", err.message, err.syscall);
        process.exit(1);
    }
}

/* Send updates to clients when they connect */

var formatMessage = function () {
 return JSON.stringify( { "table":babel } );
};

io.sockets.on('connection', function(client){
    client.send(formatMessage());
});


/* Monitoring babel */

setInterval(function() {
    if(needUpdate) {
        io.sockets.send(formatMessage());
        needUpdate = false;
    }
}, config.updateIval);

var parseBabel = function(s) {
    var tokens = s.split(' ');

    /* Work around Babel bug -- now fixed upstream
       but old nodes might be found in the wild... */
    if(tokens[1] == "route") {
        var id = tokens[2].split('-');
        if(id.length == 3) {
            tokens[2] = id[0] + "-" + id[2];
            s = tokens.join(" ");
        }
    }

    if(config.verbose)
        console.error(s);

    switch(tokens[0]) {

        case 'add':
            if(typeof babel[tokens[1]][tokens[2]] == "undefined") {
                babel[tokens[1]][tokens[2]] = {};
            } else {
                console.error("Adding a known "+tokens[1]+": "+tokens[2]);
                return false;
            }
        case 'change':
            if(typeof babel[tokens[1]][tokens[2]] == "undefined") {
                console.error("Changing a missing "+tokens[1]+": "+tokens[2]);
                return false;
            }
            for(var i = 3; i<tokens.length; i += 2)
                babel[tokens[1]][tokens[2]][tokens[i]] = tokens[i+1];
            break;
        case 'flush':
            if(typeof babel[tokens[1]][tokens[2]] == "undefined") {
                console.error("Flushing a missing "+tokens[1]+": "+tokens[2]);
                babel[tokens[1]][tokens[2]] = {};
            } else {
                delete babel[tokens[1]][tokens[2]];
            }
            break;

        case 'BABEL':
            if(tokens[1] != '0.0') {
                console.error('Unknown protocol version: '+tokens[1]);
                process.exit(1);
            }
            break;
        default:
            console.error('Ignoring unknown token: ' + tokens[0]);
    }
    needUpdate = true;
    return true;
}

var printWorld = function() {
    console.error(JSON.stringify(babel));
}

var babelListen = function(port, address) {
    var client = net.createConnection(port, address);
    client.setEncoding('ascii');
    client.setKeepAlive(true);
    /* Store the rest of Babel input, after the latest newline */
    var buffer = '';

    babel = {
        "self": {},
        "neighbour": {},
        "xroute": {},
        "route": {},
    };
    needUpdate = true;

    client.addListener('connect', function(){
        console.error("Connected to Babel.");
    });

    client.addListener('data', function(data){
        var lines = buffer.concat(data).split('\n');
        buffer = lines.pop();
        for(var i = 0; i < lines.length; i++) {
            if(!parseBabel(lines[i])) {
               console.error("Parse error: reconnecting.");
               printWorld();
               /* This will trigger a 'close' event, which reconnects */
               client.destroy();
               return;
            }
        }
    });

    client.addListener('close', function(error){
         if(error) { return; /* already handled */ }
         console.error("Babel socket close: reconnecting in 1 second.");
         setTimeout(function() {
             babelListen(port, address);
         }, 1000);
    });

    client.addListener('error', function(){
         console.error("Babel socket error: reconnecting in 1 second.");
         setTimeout(function() {
             babelListen(port, address);
         }, 1000);
    });

    /* Handle signals */
    process.on("SIGUSR2", function() {
        client.destroy();
    });
}

process.on("SIGUSR1", function() {
    printWorld();
});

babelListen(config.babelPort, config.babelAddress);
