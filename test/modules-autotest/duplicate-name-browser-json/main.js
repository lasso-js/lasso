var fooPath = './foo/hello';
var barPath = './bar/hello';

exports.foo = require(fooPath);
exports.bar = require(barPath);

window.main = exports;