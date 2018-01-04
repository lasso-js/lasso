'use strict';

const expect = require('chai').expect;
const plugin = require('./plugin');

exports.getLassoConfig = function () {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [ plugin ]
    };
};

exports.getLassoOptions = function () {
    return {
        dependencies: [
            './browser.json'
        ]
    };
};

exports.checkError = function(e) {
    const errorString = e.toString();
    expect(errorString).to.contain('Failed to initialize');
};
