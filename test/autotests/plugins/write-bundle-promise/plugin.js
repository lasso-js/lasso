'use strict';

var fs = require('fs');

module.exports = function(lasso, config) {
    lasso.config.writer = {
        init (lassoContext) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    module.exports.counter.push('init');
                    resolve();
                }, 500);
            });
        },

        writeBundle (reader, lassoContext, callback) {
            const bundle = lassoContext.bundle;
            bundle.url = 'test.com';
            module.exports.counter.push('writeBundle');
            callback();
        }
    };
};

module.exports.counter = [];
