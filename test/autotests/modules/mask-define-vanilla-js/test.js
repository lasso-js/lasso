var expect = require('chai').expect;
var path = require('path');

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            {
                "path": path.join(__dirname, 'define-global.js'),
                "mask-define": true
            },
            {
                "path": path.join(__dirname, 'library.js'),
                "mask-define": true
            },
            'require-run: ./main'
        ]
    };
};

exports.check = function(window) {
    expect(window.defineFound).to.equal(false);
};