require('foo');
exports.filename = __filename;
exports.foo = window.foo;
window.main = module.exports;