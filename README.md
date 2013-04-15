Babelweb -- Monitoring tool for the Babel routing daemon
==========================================================

Quick start  (from search.npmjs.org)
-----------

Install and start the latest babelweb release:

    npm install -g babelweb
    babeld -g 33123 ... &
    babelweb

Browse http://localhost:8080/.

Detailed instructions (from git repository or archive)
---------------------

You'll need Node.js (>= 0.10.0) and npm (provided with nodejs).  If you have not
installed them yet, [download Node.js](http://nodejs.org/download/) for your
platform.

Clone the repository if you haven't already, and cd into it:

    git clone git://git.wifi.pps.univ-paris-diderot.fr/babelweb.git
    cd babelweb

You have then two options to install babelweb:

1. Install babelweb globally (in /usr/local by default), with its dependencies:

        make install

2. Keep babelweb in the current directory, install dependencies locally, and
   add a global symlink (in /usr/local by default):

        make link

If you want to install it once and forget about it, I recommend method 1; if
you want to track development easily, method 2.  If you change your mind, run
`make uninstall` (for any of the methods).

Then, start Babel on your local host:

    babeld -g 33123 ... &

And finally start babelweb:

    babelweb

By default, the babelweb interface is located at:
http://localhost:8080/


Monitoring remote babel instances
---------------------------------

To monitor a remote babel instance (eg. running on a host called `remote`), you
have two options.

1. Create a tunnel from `remote` to `local` with ssh:

        local$ ssh -N -L[::1]:33123:[::1]:33123 username@remote

   and keep the default value for the option `routers`.

2. Use `socat` as a proxy on `remote` to make the babel local interface
   available from the outside:

        remote$ socat TCP-LISTEN:1234,fork TCP6:[::1]:33123

   and setup the option `routers` accordingly:
   
        local$ babelweb routers="remote:1234"


Options
-------

See the man page for a list of options (also available in the doc/ directory):

    man babelweb

You can specify options directly on the command-line:

    babelweb port=80 host=127.0.0.1

Alternatively, you can manage babelweb options through npm:

    npm config set babelweb:port 80

In that case, you **must** start babelweb through npm too (and cannot use
command-line options):

    npm start -g babelweb

See `man npm-config` for more details.

Security
--------
 
Babelweb does not need to be started as root anymore; regular user privileges
are recommended.

Browser support
---------------

Babelweb needs a browser supporting javascript (to fetch remote data)
and SVG (to display the network graph).  If Adobe Flash is installed, it
might be used to establish a more reliable connection (but websockets
are prefered if your browser supports them).

Babelweb has been tested and found to work with recent versions of Firefox,
Chrome, Safari and Opera (except for some visual bells and whistles).

Please, do not hesitate to send reports of working and broken browsers.

Gabriel Kerneis <kerneis@pps.univ-paris-diderot.fr>
