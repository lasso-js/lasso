exports.filename = __filename;
exports.foo = require('./hello');
exports.foo2 = require('./hello.foo');

window.main = module.exports;