wiki2tex
========

This is a little tool to convert a Gitlab/GitHub-style wiki into one pdf file

It starts at one or more files, crawls their links and puts it all into one markdown file.
Then it uses pandoc to convert it to latex, embeds it in a template (just header and footer),
and finally runs pdflatex to create the pdf.

### Configuration File

You need to create a json file for a tex configuration:

    {
        "pages": [ "pagename1", "pagename"],
        "template": "template.tex"
    }

The paths are relative to the config file's directory. `template.tex` should be a tex file with a `$body` part that will be replaced with the wiki contents.

### Dependencies:

* node v0.10+
* pandoc
* pdflatex

### Usage

    npm install
    ./index.js --input path/to/wiki/spec.json --output path/to/output.pdf
