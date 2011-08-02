Bab el-Web -- Monitoring tool for the Babel routing daemon
==========================================================

Quick start
-----------

Install and start the latest babelweb release:

    npm install -g babelweb
    babeld -g 33123 ... &
    babelweb

Detailed instructions
---------------------

You'll need nodejs (>= 0.4.0) and npm (>=1.0).  If you don't have them
installed yet, follow the [installation
instructions](https://github.com/joyent/node/wiki/Installation) for your
platform.

Clone the repository if you haven't already, and cd into it:

    git clone git://kerneis.info/babelweb
    cd babelweb

Install babelweb globally, with its dependencies:

    make install

(run `make uninstall` if you change your mind).

Alternatively, you can keep babelweb in the current directory and install
dependencies locally with:

    npm install .

Then, start Babel on your local host:

    babeld -g 33123 ... &

or create a tunnel if it is running on a remote host:

    ssh -N -L[::1]:33123:[::1]:33123 username@babel.host

And finally start babelweb:

    babelweb

(or `bin/babelweb` if you kept it local).

By default, the babelweb interface is located at:
http://localhost:8080/

Options
-------

See the man page for a list a options (also available in the doc/ directory):

    man babelweb

You can specify options directly on the command-line:

   sudo babelweb serverPort=80 serverAddress=127.0.0.1 user=www-data

Alternatively, you can manage babelweb options through npm:

    npm config set babelweb:serverPort 80

In that case, you **must** start babelweb through npm too (and cannot use
command-line options):

    npm start babelweb

(or just `npm start` if you did not install babelweb globally).  See `man
npm-config` for more details.


Security
--------
 
Bab el-Web works better when started as root, and will drop priviledges as soon
as possible.  See the man page for more details.

Browser support
---------------

Bab el-Web needs a browser supporting javascript (to fetch remote data)
and SVG (to display the network graph).  If Adobe Flash is installed, it
might be used to establish a more reliable connection (but websockets
are prefered if your browser supports them).

Bab el-Web has been tested and found to work with recent versions of Firefox
(with some minor refreshing glitches), Chrome, Safari and Opera (except for
some visual bells and whistles).

Please, do not hesitate to send reports of working and broken browsers.

    Gabriel Kerneis <kerneis@pps.jussieu.fr>
