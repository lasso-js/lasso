var nodePath = require('path');
var expect = require('chai').expect;

exports.check = function(lasso, helpers, done) {
    var myLasso = lasso.create({
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        outputDir: helpers.getOutputDir()
    });

    myLasso.lassoResource(nodePath.join(__dirname, 'foo.txt'),
        function(err, result) {
            if (err) {
                return done(err);
            }
            expect(result.url).to.equal('/static/foo-0beec7b5.txt');
            done();
        });
};

