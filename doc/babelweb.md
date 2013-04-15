babelweb(1) -- monitoring tool for babel
==============================

## SYNOPSIS

    babelweb [options]

## DESCRIPTION

Babelweb is a web-based monitoring tool for the Babel routing daemon.  It
reads informations from `babeld` through a local-interface socket (see the `-g`
option of `babeld`).

## OPTIONS

Options are a list of `key=value` pairs.

* `host`:
   local webserver address (default: `::`).
* `port`:
   local webserver port (default: `8080`).
* `routers`:
   comma-separated list of addresses and ports, specifying the local interfaces
   `babeld` is listening on (default: `[::1]:33123`).
* `update`:
   time between updates to the browser, in milliseconds (default: `3000`).
* `verbose`:
   (very) verbose output (default: `false`).

## SECURITY
 
Running as root is not necessary, and not recommended anymore.

## SIGNALS

Babelweb reacts to the SIGUSR1 and SIGUSR2 signals:

* SIGUSR1:
  dump the topology of each router as seen by babelweb (json format).
* SIGUSR2:
  restart connections to `babeld`.

## BUGS

When you find issues, please report them:

* web:
  <http://github.com/kerneis/babelweb/issues>
* email:
  Babel users mailing-list <babel-users@lists.alioth.debian.org>
  Gabriel Kerneis <kerneis@pps.univ-paris-diderot.fr>

If possible, try to reproduce the bug with the `verbose=true` option and
include the output in your report.

You can also look for kerneis in ##babel on irc://irc.freenode.net.

## SEE ALSO

babelweb-changelog(1), babeld(8).

## AUTHOR

Gabriel Kerneis <gabriel@kerneis.info>
