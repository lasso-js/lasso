var nodePath = require('path');
var expect = require('chai').expect;

exports.check = async function (lasso, helpers) {
    var myLasso = lasso.create({
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        outputDir: helpers.getOutputDir()
    });

    const lassoPageResult = await myLasso.lassoPage({
        pageName: helpers.getName(),
        dependencies: [
            nodePath.join(__dirname, 'browser.json')
        ]
    });

    expect(lassoPageResult.getOutputFilesWithInfo().length).to.equal(1);
};
