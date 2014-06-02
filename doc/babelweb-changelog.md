babelweb-changelog(1) -- Changes
===========================

## HISTORY

### 0.4.0
* Display rtt field (thanks to Baptiste Jonglez)
* Improve server-side log messages
* Configure static hostnames (via js/site-local.js)

### 0.3.0
* INCOMPATIBLE CHANGE: command-line option renaming
* IMPORTANT CHANGE: do not require root, do not drop privileges
* Support for monitoring multiple babel routers
* Ignore duplicate changes to reduce network traffic
* Set server-side process title to babelweb
* Fix various bugs and glitches in client-side UI
* Bump every dependency to latest version (Node.js, socket.io, D3.js)

### 0.2.4
* Use the latest release of D3
* Fix install dependencies for npm
* Change jussieu.fr to univ-paris-diderot.fr

### 0.2.3
* Security fix: properly drop privileges (thanks to Julien Cristau)

### 0.2.2
* Security fix: refuse to run as root

### 0.2.1
* Fix legend color for unreachable neighbours

### 0.2.0
* Fix rendering model (and many bugs)
* Do not randomize on zoom
* Change colors and add a legend
* Use a logarithmic scale (more stable graph)
* Do not display redundant routes (faster)
* Enable volatile updates
* Fix html markup and minor details in the interface

### 0.1.0
* Switch to the d3.js library, improve UI
* Make npm package
* Write documentation
* Work-around bugs in babeld and babelz

### 0.0.0
* First sketch using protovis and jquery
* Core layout established
