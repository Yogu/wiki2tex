var Q = require('q');
var fs = require('q-io/fs');

exports.load = Q.async(function*(configPath) {
	if (!(yield fs.isFile(configPath)))
		throw new Error('The config file ' + configPath + ' does not exist.');
	
	var configContents = yield fs.read(configPath);
	
	try {
		var config = JSON.parse(configContents);
	} catch (e) {
		throw new Error('Config is invalid json: ' + e);
	}
	
	if (!config.template)
		throw new Error('config.template is missing, should be path to the latex template file');
	
	var templatePath = fs.resolve(configPath, config.template);
	
	if (!(yield fs.isFile(templatePath)))
		throw new Error('The file pointed to by config.template does not exist (' + templatePath + ')');
	
	config.template = (yield fs.read(templatePath));
	
	return config;
});
