var Q = require('q');
var fs = require('q-io/fs');
var Config = require('./config.js');
var Page = require('./page.js');
var latex2pdf = require('./latex2pdf.js');

Q.longStackSupport = true;

var wikiToPDF = Q.async(function*(configFile) {
	var config = yield Config.load(configFile);
	
	var pages = yield Page.findPages(config.pages.map(function(path) { 
		return fs.resolve(configFile, path);
	}));
	
	var latexBody = yield Page.concatenateLatex(pages);
	var latex = config.template.replace(/\$body/, latexBody);
	yield latex2pdf(latex, fs.directory(configFile));
	console.log('Created ' + fs.resolve(configFile, 'wiki.pdf'));
});

Q.spawn(function*() {
	if (process.argv.length < 3)
		throw new Error('Please specify the path to the json config file as argument');
	var configPath = process.argv[2]; // 0 is node, 1 is script path
	
	yield wikiToPDF(configPath);
});
