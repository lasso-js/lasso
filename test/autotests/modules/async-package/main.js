exports.filename = __filename;

require('./lasso-loader-patch');

exports.loadFoo = function(callback) {
    require('lasso-loader').async('foo', function(err) {
        if (err) {
            return callback(err);
        }
        var foo = require('./foo');
        callback(null, foo);
    });
};

var barPackageId = 'bar';

exports.loadBar = function(callback) {
    require('lasso-loader').async(barPackageId + '', function(err) {
        if (err) {
            return callback(err);
        }
        var bar = require('./bar');
        callback(null, bar);
    });
};

exports.loadSomething = function(callback) {
    require('lasso-loader').async('something', callback);
};

window.main = module.exports;