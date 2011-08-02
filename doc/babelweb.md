babelweb(1) -- monitoring tool for babel
==============================

## SYNOPSIS

    babelweb [options]

## DESCRIPTION

Bab el-Web is a web-based monitoring tool for the Babel routing daemon.  It
reads informations from `babeld` through a local-interface socket (see the `-g`
option of `babeld`).

## OPTIONS

Options are a list of `key=value` pairs.

* `serverAddress`: local webserver address (default: `::`).
* `serverPort`: local webserver port (default: `8080`).
* `babelAddress`: address of the local interface `babeld` is listening on (default: `::1`).
* `babelPort`:  port of the local interface `babeld` is listening on (default: `33123`).
* `updateIval`: time between updates to the browser, in milliseconds (default: `3000`).
* `verbose`: (very) verbose output (default: `false`).
* `user`: drop priviledges to this user if started as root (default: ``).

## SECURITY
 
Running as root is not mandatory but recommended to enable the Flash policy
server used by socket.io (on port 843 --- open your firewall!).  Bab el-Web
drops priviledges as soon as the server is started, and refuses to continue if
dropping priviledges fails.  Use the "user" option to choose which user to drop
priviledges to.

## BUGS

When you find issues, please report them:

* web:
  <http://github.com/kerneis/babelweb/issues>
* email:
  Babel users mailing-list <babel-users@lists.alioth.debian.org>
  Gabriel Kerneis <gabriel@kerneis.info>

If possible, try to reproduce the bug with the `verbose=true` option and
include the output in your report.

You can also look for kerneis in ##babel on irc://irc.freenode.net.

## SEE ALSO

babelweb-changelog(1), babeld(8).

## AUTHOR

Gabriel Kerneis <gabriel@kerneis.info>
