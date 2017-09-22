const expect = require('chai').expect;

exports.check = function (lasso, helpers) {
    var config = {
        bundles: [
            {
                name: 'foo',
                dependencies: [
                    "require: " + require.resolve('./foo.js')
                ]
            }
        ]
    };

    var myLasso1 = lasso.create(config);
    var myLasso2 = lasso.create(config);
    expect(myLasso1.config.getConfigFingerprint()).to.equal(myLasso2.config.getConfigFingerprint());
};
