var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        includeSlotNames: false,
        bundlingEnabled: false
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                pageName: 'css-resources-multiple-pages-no-bundling-page1',
                dependencies: [
                    path.join(__dirname, 'foo.css')
                ]
            },
            check(lassoPageResult, writerTracker) {
                var resources = lassoPageResult.resources;
                var outputFiles = resources.map((resource) => {
                    return resource.outputFile;
                });

                expect(outputFiles[0]).to.contain('css-resources-multiple-pages-no-bundling-page1');
            }
        },
        {
            lassoOptions: {
                pageName: 'css-resources-multiple-pages-no-bundling-page2',
                dependencies: [
                    path.join(__dirname, 'foo.css')
                ]
            },
            check(lassoPageResult, writerTracker) {
                var resources = lassoPageResult.resources;
                var outputFiles = resources.map((resource) => {
                    return resource.outputFile;
                });

                expect(outputFiles[0]).to.contain('css-resources-multiple-pages-no-bundling-page2');
            }
        }
    ];
};