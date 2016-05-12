var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        includeSlotNames: true
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    {
                        path: path.join(__dirname, 'style.css'),
                        inline: true
                    }
                ]
            },
            check(lassoPageResult, writerTracker, helpers) {
                var head = lassoPageResult.getSlotHtml('head');
                helpers.compare(head, '.html');
            }
        }
    ];
};