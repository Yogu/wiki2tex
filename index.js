var cli = require('cli').enable('version');
var fs = require('fs');
var path = require('path');
var markdownpdf = require("markdown-pdf");
var tmp = require('tmp');
var download = require('download');
var execSync = require('exec-sync');

var HEADER = 

cli.parse({
    input: ['i', 'Path to json file with template and pages properties', 'path' ],
    output:   ['o', 'Path to save the pdf file to', 'path', 'wiki.pdf'],
});

cli.main(function(args, options) {
	var includedFiles = [];
	var document = '';
	
	tmp.dir(function(err, tmpDir) {
		function tryAdd(target, source) {
			var extensions = ['', '.md', '.markdown', '.txt'];
			
			var fileName = null;
			var found = false;
			for (var i = 0; i < extensions.length; i++) {
				var extension = extensions[i];
				fileName = target + extension;
	
				if (fs.existsSync(fileName)) {
					found = true;
					break;
				}
			}
			
			if (!found)
				console.log(target + ' does not exist (referenced by ' + source + ')');
			else if (includedFiles.indexOf(fileName) < 0) {
				includedFiles.push(fileName);
				traverse(fileName);
			}
		}
		
		function traverse(fileName) {
			var contents = fs.readFileSync(fileName);
			
			// [\s\S] matches all chars, including linebreaks
			var filteredContents = (contents + '').replace(/<!--\s*BEGIN_NOT_IN_PDF\s*-->[\s\S]+?<!--\s*END_NOT_IN_PDF\s*-->/g, '');
			
			document += filteredContents + '\n\n';
	
			// Follow the links
			var regexp = new RegExp(/(!?)\[.+?\]\((.+?)\)/g);
			while (match = regexp.exec(contents)) {
				var isImage = match[1] == '!';
				var target = match[2];
				target = target.replace(/#.*/g, ''); // ignore anchor
				
				if (target != '' && target.indexOf(':') < 0)
					target = path.resolve(path.dirname(fileName), target);
				
				if (target && !isImage)
					tryAdd(target, fileName);
			}
		}

		var config = require(options.input);
		var rootPath = path.dirname(options.input);
		config.pages.forEach(function(fileName) {
			tryAdd(path.resolve(rootPath, fileName), 'root');
		});

		var mdPath = tmpDir + '/document.md';
		var latexPath = tmpDir + '/document.tex';
		var pdfPath = tmpDir + '/document.pdf';
		fs.writeFileSync(mdPath, document);
		
		// markdown-yaml_metadata_block disables yaml parsing (mistakes horizontal lines for yaml section separators)
		execSync('pandoc -f markdown-yaml_metadata_block -t latex -o ' + escapeshell(latexPath) + ' ' + escapeshell(mdPath));
		
		var latexBody = fs.readFileSync(latexPath);
		var template = fs.readFileSync(path.resolve(rootPath, config.template));
		var latex = (template + '').replace(/\$body/, latexBody);
		
		fs.writeFileSync(latexPath, latex);
                console.log('tex file created at ' + latexPath);
		execSync('pdflatex -output-format pdf -output-directory ' + escapeshell(tmpDir) + ' ' + escapeshell(latexPath));
		fs.writeFileSync(options.output, fs.readFileSync(pdfPath));
		console.log('pdf file created at ' + options.output);
	});
});

function escapeshell(cmd) {
	return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};
