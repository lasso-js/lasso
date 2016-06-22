var nodePath = require('path');
var expect = require('chai').expect;

exports.check = function(lasso, helpers, done) {
    lasso.configure({
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        outputDir: helpers.getOutputDir()
    });

    lasso.lassoPage({
            pageName: helpers.getName(),
            dependencies: [
                nodePath.join(__dirname, 'browser.json')
            ]
        })
        .then((lassoPageResult) => {
            expect(lassoPageResult.getOutputFilesWithInfo().length).to.equal(1);
            done();
        })
        .catch(done);
};

