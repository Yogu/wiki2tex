var Q = require('q');
var fs = require('q-io/fs');
var pandoc = Q.denodeify(require('pdc'));
var Set = require('collections/set');
var Dict = require('collections/dict');
var svg2pdf = require('./svg2pdf');
var path = require('path');

function Page(fileName) {
	this.fileName = fileName;
}

Page.preprocessMarkdown = function(text) {
	text = text.replace(/<!--\s*BEGIN_NOT_IN_PDF\s*-->[\s\S]+?<!--\s*END_NOT_IN_PDF\s*-->/g, '');
	return text;
};

Page.postprocessLatex = function(text) {
	// fix links; anchors not yet supported
	text = text.replace(/\\href{([^\\#}]*)(\\#[^}]+?)?}/g, '\\hyperref[$1]');
	text = text.replace(/\\url{([^}]+?)}/g, '\\hyperref[$1]{$1}');

	// fix image positions
	text = text.replace(/\\begin\{figure\}\[\w+\]/g, '\\begin{figure}[H]');

	// make images max. 100% width/height
	text = text.replace(/\\includegraphics/g, '\\includegraphics[max width=\\linewidth,max totalheight=\\textheight]');

	// fix quotation marks to tabel ones
	text = text.replace(/''/g, "\"'").replace(/``/g, "\"`");

	return text;
};

Page.findPages = Q.async(function*(fileNames, pages) {
	if (!pages)
		pages = new Dict();

	for (var i = 0; i < fileNames.length; i++) {
		var fileName = fileNames[i];
		if (pages.has(fileName))
			break;

		var page = new Page(fileName);
		pages.add(page, fileName);
		var outgoingLinks = yield page.getOutgoingLinks();
		yield Page.findPages(outgoingLinks, pages);
	}
	return pages.toArray();
});

Page.concatenateLatex = Q.async(function*(pages) {
	var latex = '';
	for (var i = 0; i < pages.length; i++) {
		var page = pages[i];
		latex += (yield page.getFinalLatex()) + '\n\n';
	}
	latex = Page.postprocessCompleteLatex(latex);
	return latex;
});

Page.postprocessCompleteLatex = function(latex) {
	return latex.replace(/§BEGIN\\_TABLES\n([\s\S]+?)§END\\_TABLES/g,
		function(match, content) { return Page.convertHeadingsToTables(content) });
};

Page.convertHeadingsToTables = function(latex) {
	console.log('converting headings to tables...');
	return latex.replace(/(\\subsection\{[\s\S]+?\}\n)([\s\S]+?)(?=$|(\\(sub?)section.*\n))/g,
		function(match, prefix, content) {
			return prefix + Page.convertHeadingsToTable(content);
		});
};

Page.convertHeadingsToTable = function(latex) {
	var prefix = "\\begin{longtable}{|p{\\dimexpr 0.25\\linewidth-2\\tabcolsep}" +
		"|p{\\dimexpr 0.75\\linewidth-2\\tabcolsep}|} \\hline\n";
	var suffix = "\\end{longtable}\n";
	var content = latex.replace(/\\subsubsection\{([\s\S]+?)\}.*\n([\s\S]+?)(?=$|(\\((sub)*section)))/g,
		function(match, heading, content) {
			return heading + " & " + content + " \\\\ \\hline\n";
		});
	return prefix + content + suffix;
};

Page.prototype.getPageName = function() {
	return fs.base(this.fileName, fs.extension(this.fileName));
};

Page.getRealFileName = Q.async(function*(target, base) {
	var extensions = ['', '.md', '.markdown', '.txt'];
	for (var i = 0; i < extensions.length; i++) {
		var extension = extensions[i];
		var fileName = fs.resolve(base, target + extension);

		if (yield fs.isFile(fileName))
			return fileName;
	}

	return false;
});

Page.prototype.getRawMarkdown = Q.async(function*() {
	if (this.rawMarkdown)
		return this.rawMarkdown;

	this.rawMarkdown = fs.read(this.fileName);
	return this.rawMarkdown;
});

/**
 * Gets a promise for the markdown that should be put into pandoc
 */
Page.prototype.getProcessedMarkdown = Q.async(function*() {
	var raw = yield this.getRawMarkdown();
	return Page.preprocessMarkdown(raw);
});

/**
 * Gets a promise for the raw pandoc output
 */
Page.prototype.getRawLatex = Q.async(function*() {
	var md = yield this.getProcessedMarkdown();
	console.log('Converting ' + this.fileName + ' to latex...');
	return yield pandoc(md, 'markdown-yaml_metadata_block', 'latex');
});

/**
 * Gets a promise for the latex that should be included in the final latex document
 */
Page.prototype.getFinalLatex = Q.async(function*() {
	var latex = yield this.getRawLatex();
	var prefix = '\\label{' + this.getPageName() + '}\n\n';
	latex = prefix + latex;
	latex = yield svg2pdf(latex, path.dirname(this.fileName));
	latex = Page.postprocessLatex(latex);
	return latex;
});

/**
 * Gets a set of file paths this page links to
 */
Page.prototype.getOutgoingLinks = Q.async(function*() {
	var raw = yield this.getRawMarkdown();

	var links = new Set();

	var regexp = new RegExp(/(!?)\[.+?\]\((.+?)\)/g);
	while (match = regexp.exec(raw)) {
		var isImage = match[1] == '!';
		if (isImage)
			break;
		var target = match[2];
		target = target.replace(/#.*/g, ''); // ignore anchor

		if (target != '' && target.indexOf(':') < 0)
			target = target;
		if (!target)
			break;

		if (target && !isImage)
			links.add(target);
	}

	var fileNames = new Set();
	while (links.length) {
		var target = links.shift();
		var fileName = yield Page.getRealFileName(target, this.fileName);
		if (!fileName)
			console.log(target + ' does not exist (referenced by ' + this.fileName + ')');
		else
			fileNames.add(fileName);
	}

	return fileNames.toArray();
});

module.exports = Page;
