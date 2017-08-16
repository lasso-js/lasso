const nodePath = require('path');
const expect = require('chai').expect;

exports.check = async function (lasso, helpers) {
    lasso.configure({
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        outputDir: helpers.getOutputDir()
    });

    const lassoPageResult = await lasso.lassoPage({
        pageName: helpers.getName(),
        dependencies: [
            nodePath.join(__dirname, 'browser.json')
        ]
    });

    expect(lassoPageResult.getOutputFilesWithInfo().length).to.equal(1);
};
