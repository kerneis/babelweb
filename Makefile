SHELL = /bin/sh

docs = $(shell find doc -name '*.md' \
				|sed 's|.md|.1|g' \
				|sed 's|doc/|man1/|g' )

doc_subfolders = $(shell find doc -type d \
									|sed 's|doc/|man1/|g' )

all: man

install:
	npm install . -g

clean: uninstall
	npm cache clean

uninstall:
	npm rm babelweb -g

link: uninstall
	npm link

man: man1 $(docs)

man1: $(doc_subfolders)
	[ -d man1 ] || mkdir -p man1

# use `npm install ronn` for this to work.
man1/%.1: doc/%.md
	@[ -x ./node_modules/.bin/ronn ] || npm install ronn
	./node_modules/.bin/ronn --roff $< > $@

man1/%/: doc/%/
	@[ -d $@ ] || mkdir -p $@

.PHONY: all install clean uninstall link man
