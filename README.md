wiki2tex
========

This is a little tool to convert a Gitlab/GitHub-style wiki into one latex file.

It starts at one or more files, crawls their links and puts it all into one markdown file.
Then it uses pandoc to convert it to latex. The latex2pdf conversion has to be done manually
at the moment (e.g. with writelatex.com)

### Dependencies:

* node v0.10+
* pandoc

### Usage

    npm install
    ./index.js path/to/wiki/home.markdown -o path/to/output.tex
