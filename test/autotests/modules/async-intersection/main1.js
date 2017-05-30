exports.filename = __filename;

require('./lasso-loader-patch');

exports.load = function(callback) {
    require('lasso-loader').async(function(err) {
        if (err) {
            return callback(err);
        }
        var foo = require('./foo');
        callback(null, {
            foo: foo,
            helper: require('./main1-helper')
        });
    });
};


window.main = module.exports;