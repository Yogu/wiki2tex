var Q = require('q');
var exec = Q.denodeify(require('child_process').exec);
var fs = require('q-io/fs');
var Set = require('collections/set');
var createTmpDir = Q.denodeify(require('tmp').dir);

var SVG_REGEXP = /\\includegraphics\{([^\}]+)\.svg\}/g;

function getSVGReferences(latex) {
	var re = new RegExp(SVG_REGEXP);
	var match;
	var files = new Set();
	while (match = re.exec(latex)) {
		var fileName = match[1];
		files.add(fileName);
	}
	return files.toArray();
}

var convertSVG = Q.async(function*(latex) {
	var svgFiles = getSVGReferences(latex);
	if (!svgFiles.length)
		return latex;
	
	var tmpDir = yield createTmpDir();
	
	for (var i = 0; i < svgFiles.length; i++) {
		var fileName = svgFiles[i];
		var pdfFileName = fs.join(tmpDir, fileName.replace(/\W/g, '_') + '.pdf');
		yield exec('inkscape -z -D --file=' + escapeshell(fileName + '.svg') + ' --export-pdf=' + 
				escapeshell(pdfFileName));
		latex = latex.replace(
				'\\includegraphics{' + fileName + '.svg}',
				'\\includegraphics{' + pdfFileName + '}');
	}
	
	return latex;
});

module.exports = Q.async(function*(latex, directory) {
	var basePath = fs.join(directory, 'wiki');
	
	latex = yield convertSVG(latex);
	
	yield fs.write(basePath + '.tex', latex);
	yield exec("rubber --pdf " + escapeshell(basePath));
});

function escapeshell(cmd) {
	return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
}
