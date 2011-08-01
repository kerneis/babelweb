Monitoring tool for the Babel routing protocol
==============================================

Quick start
-----------

Prerequisites: nodejs (>= 0.4.0) and npm (>=1.0).
[Detailed instructions](https://github.com/joyent/node/wiki/Installation).

Install dependencies:

    npm install .

Start Babel:

    babeld -g 33123 ... &
    # make a tunnel if babel is not running on your local host
    ssh -L[::1]:33123:[::1]:33123 username@babel.host

Run:

    npm start

Browse http://localhost:8080/


Configure
---------

Look at the beginning of server.js for a list of available options.

You can specify options directly on the command-line:

   sudo node server.js serverPort=80 serverAddress=127.0.0.1 uid=www-data

Or use npm to store them permanently:

    npm config set serverPort 80

(Note that npm options are stored globally, which looks terribly wrong because
of name clashes.)

The NODE_ENV environment variable is also checked:

    export NODE_ENV="development"  # or "production"

Security
--------
 
Running as root is not mandatory but recommended to enable the Flash policy
server in production mode (on port 843 --- open your firewall!).  Bab el-Web
drops priviledges as soon as the server is started, and refuses to continue if
dropping priviledges fails.  Use the "uid" option to choose the user to drop
priviledges to.

Browser support
---------------

Bab el-Web needs a browser supporting javascript (to fetch remote data)
and SVG (to display the network graph).  If Adobe Flash is installed, it
might be used to establish a more reliable connection (but websockets
are prefered if your browser supports them).

Please, do not hesitate to send reports of working and broken browsers.

Bugs
----

Plenty, this is an experimental proof-of-concept.  Please report bugs
and send patches at:

    Gabriel Kerneis <kerneis@pps.jussieu.fr>
