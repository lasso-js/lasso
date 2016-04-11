exports.filename = __filename;

var virtualModulePath = '/virtual-module/something.foo';
exports.foo = require(virtualModulePath);

window.main = module.exports;