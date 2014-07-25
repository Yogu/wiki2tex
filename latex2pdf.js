var Q = require('q');
var exec = Q.denodeify(require('child_process').exec);
var fs = require('q-io/fs');

module.exports = Q.async(function*(latex, directory) {
	var basePath = fs.join(directory, 'wiki');
	
	yield fs.write(basePath + '.tex', latex);
	yield exec('rubber --pdf ' + escapeshell(basePath));
});

function escapeshell(cmd) {
	return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};
