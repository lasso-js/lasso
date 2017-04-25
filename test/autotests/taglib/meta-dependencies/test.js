var expect = require('chai').expect;

require('marko/node-require');

exports.getLassoConfig = function() {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        plugins: [
            require('lasso-marko')
        ]
    };
};

exports.check = function(html) {
    expect(html).to.contain('/components/my-component/index.marko.js');
};