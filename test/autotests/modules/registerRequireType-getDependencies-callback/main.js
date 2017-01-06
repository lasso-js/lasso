exports.filename = __filename;

var helloPath = './hello.foo';
exports.hello = require(helloPath);
exports.world = require('./world.foo');

window.main = module.exports;