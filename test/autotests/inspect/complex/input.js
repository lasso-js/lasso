var raptorLoader = require('lasso-loader');

exports.test = function(input) {
    for (var i=0; i<input.length; i++) {
        if (true) {
            require('foo');
        }
    }

    require('bar');

    raptorLoader.async(['./browser.json'], function(err) {
        require('baz');

        require('lasso-loader').async(function(err) {
            require('cat');
        });
    });

    var asyncLoaders = {
        personProfile: function(callback) {
            require('lasso-loader').async(
                [
                    'require: avatar',
                    'require: address'
                ], callback);
        }
    }

    function loadModule(name, callback) {
        asyncLoaders[name](callback);
    }
}