var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    {
                        type: 'js',
                        url: 'http://code.jquery.com/jquery-1.11.0.min.js',
                        external: false
                    }
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(lassoPageResult.getBodyHtml()).to.equal('<script src="/static/bundling-external-js-inlined-445d8c96.js"></script>');
                expect(lassoPageResult.getHeadHtml()).to.equal('');
            }
        }
    ];
};