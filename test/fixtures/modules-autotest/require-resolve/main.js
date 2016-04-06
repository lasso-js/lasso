exports.filename = __filename;
exports.fooPath = require.resolve('./foo');
exports.foo1 = require('./foo');
exports.foo2 = require(require.resolve('./foo'));

window.main = module.exports;