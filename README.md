wiki2tex
========

This is a little tool to convert a Gitlab/GitHub-style wiki into one pdf file

It starts at one or more files, crawls their links and puts it all into one markdown file.
Then it uses pandoc to convert it to latex, embeds it in a template (just header and footer),
and finally runs rubber to create the pdf.

### Configuration File

You need to create a json file for a tex configuration:

    {
        "pages": [ "pagename1.markdown", "pagename2.txt"],
        "template": "template.tex"
    }

The paths are relative to the config file's directory. `template.tex` should be a tex file with a `$body` part that will be replaced with the wiki contents.

### Dependencies:

* node v0.11+
* pandoc
* rubber
* inkscape (only if you include svg graphics)
* latex packages referenced by the template (recommended: ubuntu packages `texlive-latex-recommended texlive-latex-full texlive-fonts-recommended texlive-lang-german`)

### Usage

    npm install
    node --harmony_generators ./index.js path/to/wiki/spec.json
