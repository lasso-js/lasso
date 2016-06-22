var nodePath = require('path');
var expect = require('chai').expect;

exports.check = function(lasso, helpers, done) {
    var myLasso = lasso.create({
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        outputDir: helpers.getOutputDir()
    });

    myLasso.lassoPage({
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

