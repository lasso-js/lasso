const expect = require('chai').expect;

exports.prebuildConfig = true;

exports.checkError = function (err) {
    expect(err.message).to.equal('"pageConfig" should either be an array or object passed to "lasso.prebuildPage(...)"');
};
