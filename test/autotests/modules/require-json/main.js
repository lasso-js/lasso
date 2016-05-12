exports.filename = __filename;
exports.foo1 = require('./foo');
exports.foo2 = require('./foo.json');

window.main = module.exports;