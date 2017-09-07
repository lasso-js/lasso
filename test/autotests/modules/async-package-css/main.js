exports.filename = __filename;

require('./lasso-loader-patch');

exports.loadSomething = function(callback) {
    require('lasso-loader').async('something', callback);
};

window.main = module.exports;
