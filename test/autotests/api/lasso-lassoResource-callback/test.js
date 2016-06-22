var nodePath = require('path');
var expect = require('chai').expect;

exports.check = function(lasso, helpers, done) {
    lasso.configure({
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        outputDir: helpers.getOutputDir()
    });

    lasso.lassoResource(nodePath.join(__dirname, 'foo.txt'),
        function(err, result) {
            if (err) {
                return done(err);
            }
            expect(result.url).to.equal('/static/foo-0beec7b5.txt');
            done();
        });
};

