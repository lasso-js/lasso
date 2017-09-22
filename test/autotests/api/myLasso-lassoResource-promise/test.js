const nodePath = require('path');
const expect = require('chai').expect;

exports.check = async function (lasso, helpers) {
    const myLasso = lasso.create({
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        outputDir: helpers.getOutputDir()
    });

    const result = await myLasso.lassoResource(nodePath.join(__dirname, 'foo.txt'));
    expect(result.url).to.equal('/static/foo-0beec7b5.txt');
};
