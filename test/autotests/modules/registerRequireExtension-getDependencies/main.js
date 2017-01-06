exports.filename = __filename;

exports.hello = require('./hello.foo');
exports.world = require('./world.foo');

window.main = module.exports;