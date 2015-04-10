'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var path = require('path');
var util = require('./util');
var outputDir = path.join(__dirname, 'build');
var series = require('raptor-async/series');

require('app-module-path').addPath(path.join(__dirname, 'src'));
describe('lasso/index', function() {
    beforeEach(function(done) {
        util.rmdirRecursive(outputDir);
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        require('raptor-promises').enableLongStacks();
        require('raptor-logging').configureLoggers({
            'lasso': 'WARN',
            'raptor-cache': 'WARN'
        });
        done();
    });
    it('should allow for optimizing a page with fingerprints enabled', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: true
            },
            flags: ['jquery', 'browser'],
            bundlingEnabled: true,
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'nestedA'
                    },
                    {
                        'package': 'nestedB'
                    },
                    {
                        'package': 'nestedC'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'testPage-7fe8fdc6.js',
                    'testPage-ad75c8ad.css'] );
                expect(writerTracker.getCodeForFilename('testPage-7fe8fdc6.js')).to.equal('nestedB_js\nnestedA_js\nnestedC_js');
                expect(writerTracker.getCodeForFilename('testPage-ad75c8ad.css')).to.equal('nestedB_css\nnestedA_css\nnestedC_css');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should handle de-duplication correctly', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            outputDir: outputDir,
            fingerprintsEnabled: false,
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'bundle1',
                    dependencies: [
                        'moduleA',
                        'moduleB'
                    ]
                },
                {
                    name: 'bundle2',
                    dependencies: [
                        'moduleB',
                        'moduleC'
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    'moduleA',
                    'moduleB',
                    'moduleC',
                    'moduleD'
                    ],
                from: module
            })
            .then(function(lassoPageResult) {
				var paths = [
                    path.join(__dirname, 'build/bundle1.js').replace(/\\/g, "/"),
                    path.join(__dirname, 'build/bundle2.js').replace(/\\/g, "/"),
                    path.join(__dirname, 'build/testPage.js').replace(/\\/g, "/")
                ];

                expect(writerTracker.getOutputPaths()).to.deep.equal(paths);
                expect(writerTracker.getCodeForFilename('bundle1.js')).to.equal('moduleA_js\nmoduleB_js');
                expect(writerTracker.getCodeForFilename('bundle2.js')).to.equal('moduleC_js');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('moduleD_js');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for slots', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                includeSlotNames: true,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser']
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'mixedA'
                    },
                    {
                        'package': 'slotA'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                expect(writerTracker.getOutputPaths()).to.deep.equal( [
                    path.join(__dirname, 'build/testPage-body.css').replace(/\\/g, "/"),
                    path.join(__dirname, 'build/testPage-body.js').replace(/\\/g, "/"),
                    path.join(__dirname, 'build/testPage-head.css').replace(/\\/g, "/"),
                    path.join(__dirname, 'build/testPage-head.js').replace(/\\/g, "/")
                ] );
                var head = lassoPageResult.getSlotHtml('head').replace(/\\/g, "/");
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(head).to.equal('<link rel="stylesheet" type="text/css" href="/testPage-head.css">\n<script type="text/javascript" src="/testPage-head.js"></script>');
                expect(body).to.equal('<link rel="stylesheet" type="text/css" href="/testPage-body.css">\n<script type="text/javascript" src="/testPage-body.js"></script>');
                expect(writerTracker.getCodeForFilename('testPage-head.css')).to.equal('mixedA_css');
                expect(writerTracker.getCodeForFilename('testPage-head.js')).to.equal('slotA_js');
                expect(writerTracker.getCodeForFilename('testPage-body.css')).to.equal('slotA_css');
                expect(writerTracker.getCodeForFilename('testPage-body.js')).to.equal('mixedA_js');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for slots overriding', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                includeSlotNames: true,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser']
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'mixedA',
                        'js-slot': 'custom-body',
                        'css-slot': 'custom-head'
                    },
                    {
                        'package': 'slotB'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
				var customhead = lassoPageResult.getSlotHtml('custom-head').replace(/\\/g, "/");
				var custombody = lassoPageResult.getSlotHtml('custom-body').replace(/\\/g, "/");
				var head2 = lassoPageResult.getSlotHtml('head2').replace(/\\/g, "/");
				var body2 = lassoPageResult.getSlotHtml('body2').replace(/\\/g, "/");
                expect(customhead).to.equal('<link rel="stylesheet" type="text/css" href="/testPage-custom-head.css">');
                expect(custombody).to.equal('<script type="text/javascript" src="/testPage-custom-body.js"></script>');
                expect(head2).to.equal('<script type="text/javascript" src="/testPage-head2.js"></script>');
                expect(body2).to.equal('<link rel="stylesheet" type="text/css" href="/testPage-body2.css">');
                expect(writerTracker.getCodeForFilename('testPage-custom-head.css')).to.equal('mixedA_css\nslotB_css');
                expect(writerTracker.getCodeForFilename('testPage-custom-body.js')).to.equal('mixedA_js\nslotB_js');
                expect(writerTracker.getCodeForFilename('testPage-head2.js')).to.equal('nestedB_js\nnestedA_js');
                expect(writerTracker.getCodeForFilename('testPage-body2.css')).to.equal('nestedB_css\nnestedA_css');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for configurable bundles', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'bundleA',
                    dependencies: [
                        {
                            'package': 'nestedA'
                        }
                    ]
                },
                {
                    name: 'bundleB',
                    dependencies: [
                        {
                            'package': 'nestedB'
                        }
                    ]
                },
                {
                    name: 'bundleC',
                    dependencies: [
                        {
                            'package': 'nestedC'
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'nestedA'
                    },
                    {
                        'package': 'nestedB'
                    },
                    {
                        'package': 'nestedC'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'bundleA.css',
                    'bundleA.js',
                    'bundleB.css',
                    'bundleB.js',
                    'bundleC.css',
                    'bundleC.js'] );
                expect(writerTracker.getCodeForFilename('bundleA.js')).to.equal('nestedA_js');
                expect(writerTracker.getCodeForFilename('bundleA.css')).to.equal('nestedA_css');
                expect(writerTracker.getCodeForFilename('bundleB.js')).to.equal('nestedB_js');
                expect(writerTracker.getCodeForFilename('bundleB.css')).to.equal('nestedB_css');
                expect(writerTracker.getCodeForFilename('bundleC.js')).to.equal('nestedC_js');
                expect(writerTracker.getCodeForFilename('bundleC.css')).to.equal('nestedC_css');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for configurable bundles with "recurseInto" set to "all"', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'bundleA',
                    dependencies: [
                        {
                            'package': 'nestedA',
                            'recurseInto': 'all'
                        }
                    ]
                },
                {
                    name: 'bundleB',
                    dependencies: [
                        {
                            'package': 'nestedB'
                        }
                    ]
                },
                {
                    name: 'bundleC',
                    dependencies: [
                        {
                            'package': 'nestedC'
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    'package:nestedA',
                    {
                        'package': 'nestedB'
                    },
                    {
                        'package': 'nestedC'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'bundleA.css',
                    'bundleA.js',
                    'bundleC.css',
                    'bundleC.js'] );
                expect(writerTracker.getCodeForFilename('bundleA.js')).to.equal('nestedB_js\nnestedA_js');
                expect(writerTracker.getCodeForFilename('bundleA.css')).to.equal('nestedB_css\nnestedA_css');
                expect(writerTracker.getCodeForFilename('bundleC.js')).to.equal('nestedC_js');
                expect(writerTracker.getCodeForFilename('bundleC.css')).to.equal('nestedC_css');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for loader metadata', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                includeSlotNames: true,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser']
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'mixedA'
                    },
                    {
                        'package': 'asyncA'
                    },
                    {
                        'type': 'loader-metadata'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
				var head = lassoPageResult.getSlotHtml('head').replace(/\\/g, '/');
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, '/');
                expect(writerTracker.getCodeForFilename('testPage-body.js')).to.equal('mixedA_js\nmoduleA_js\n(function(loaderMeta) {\nloaderMeta[\"asyncA/foo\"] = {\"js\":[\"/testPage-async-body.js\"]};\nloaderMeta[\"asyncA/bar\"] = {\"css\":[\"/testPage-async-head.css\"]};\n})(window.$rloaderMeta || (window.$rloaderMeta = {}));');
                expect(writerTracker.getCodeForFilename('testPage-head.css')).to.equal('mixedA_css');
                expect(writerTracker.getOutputFilenames()).to.deep.equal( ['testPage-async-body.js', 'testPage-async-head.css', 'testPage-body.js', 'testPage-head.css'] );
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(head).to.equal('<link rel="stylesheet" type="text/css" href="/testPage-head.css">');
                expect(body).to.equal('<script type="text/javascript" src="/testPage-body.js"></script>');

                // ACTUAL:
                // {"nestedA":{"css":["/testPage-async-head.css"],"js":["/testPage-async-body.js"]}}
                expect(writerTracker.getCodeForFilename('testPage-async-body.js')).to.equal('asyncA_js');
                expect(writerTracker.getCodeForFilename('testPage-async-head.css')).to.equal('asyncA_css');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for loader metadata with configurable bundles', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                includeSlotNames: true,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'mixedA',
                    dependencies: [
                        {
                            'package': 'mixedA'
                        }
                    ]
                },
                {
                    name: 'mixedB',
                    dependencies: [
                        {
                            'package': 'mixedB'
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'asyncB'
                    },
                    {
                        'package': 'moduleA'
                    },
                    {
                        'type': 'loader-metadata'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'mixedA-body.js',
                    'mixedA-head.css',
                    'mixedB-body.js',
                    'mixedB-head.css',
                    'testPage-body.js'] );
				var head = lassoPageResult.getSlotHtml('head').replace(/\\/g, "/");
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(head).to.equal('');
                expect(body).to.equal('<script type="text/javascript" src="/testPage-body.js"></script>');

                // ACTUAL:
                // {"nestedA":{"css":["/testPage-async-head.css"],"js":["/testPage-async-body.js"]}}
                expect(writerTracker.getCodeForFilename('mixedA-body.js')).to.equal('mixedA_js');
                expect(writerTracker.getCodeForFilename('mixedA-head.css')).to.equal('mixedA_css');
                expect(writerTracker.getCodeForFilename('mixedB-body.js')).to.equal('mixedB_js');
                expect(writerTracker.getCodeForFilename('mixedB-head.css')).to.equal('mixedB_css');
                expect(writerTracker.getCodeForFilename('testPage-body.js')).to.equal('moduleA_js\n(function(loaderMeta) {\nloaderMeta[\"asyncB/foo\"] = {\"css\":[\"/mixedA-head.css\"],\"js\":[\"/mixedA-body.js\"]};\nloaderMeta[\"asyncB/bar\"] = {\"css\":[\"/mixedB-head.css\"],\"js\":[\"/mixedB-body.js\"]};\n})(window.$rloaderMeta || (window.$rloaderMeta = {}));');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for output transforms', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            plugins: [
                {
                    plugin: function(theLasso, config) {
                        theLasso.addTransform(require('./src/transforms/css-transform1.js'));
                        theLasso.addTransform(require('./src/transforms/css-transform2.js'));
                        theLasso.addTransform(require('./src/transforms/js-transform1-async.js'));
                        theLasso.addTransform(require('./src/transforms/js-transform2-async.js'));
                    }
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'transformsA'
                    }],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.outputFilesByPath);
                expect(writerTracker.getOutputFilenames()).to.deep.equal( ['testPage.css', 'testPage.js'] );
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('transformsA_js-JavaScriptTransform1Async-JavaScriptTransform2Async');
                expect(writerTracker.getCodeForFilename('testPage.css')).to.equal('TRANSFORMSA_CSS-CSSTRANSFORM1-CSSTransform2');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for in-place deployment', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            inPlaceDeployment: {
                enabled: true,
                urlPrefix: '/in-place'
            },
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'mixedA'
                    },
                    {
                        'package': 'mixedB'
                    }],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var head = lassoPageResult.getSlotHtml('head').replace(/\\/g, "/");
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [] );
                expect(head).to.equal('<link rel="stylesheet" type="text/css" href="/in-place/src/mixedA/mixedA.css">\n<link rel="stylesheet" type="text/css" href="/in-place/src/mixedB/mixedB.css">');
                expect(body).to.equal('<script type="text/javascript" src="/in-place/src/mixedA/mixedA.js"></script>\n<script type="text/javascript" src="/in-place/src/mixedB/mixedB.js"></script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for image URLs in CSS files to be resolved', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: true
            },
            resolveCssUrls: true
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'css-url-transform'
                    }],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'ebay-logo-d481eb85.png',
                    'testPage-4b7673cd.css'
                ] );
                var expected = '.test-1 {background-image: url(ebay-logo-d481eb85.png);}\n.test-2 {background-image: url(ebay-logo-d481eb85.png);}\n.test-3 {background-image: url(ebay-logo-d481eb85.png);}\n.test-4 {background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAeCAYAAABt5kPUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNzdGMTE3NDA3MjA2ODExODhDNkIzODA1MTg5Nzc0NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRTg2MEMyMzZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRTg2MEMyMjZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAyODAxMTc0MDcyMDY4MTE5OTRDOTI2RkUxMEEyMEJFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3N0YxMTc0MDcyMDY4MTE4OEM2QjM4MDUxODk3NzQ2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Yff30gAAE/BJREFUeNrsWgdwHdW5/s+Wu7u3q3fJspqLLMuVYINt3AgQwjPFYCCN+ogpLyRgCKQHAo/H8OAFhgAOxQQCDt3E2Bg74IK7ZMuyZCFbVpescnvZet5/9kpuhJbMvJkwb2d2tPferd/5/6+cFTHDESCiAPrBZjD7+oBqOpjHjoE5MACEFwAoBbZwGekgDh2D95QJ8HthGsjUAAKpheCGYYJ3b0fibwmd5nIERPx6A67L4KRF1SlU5jhgdrkTMj0C9IcN0A0K00oUEHkCPicP51S5QBIIuPg48Byet3OVfQ/UiADoIaBmDAjnAOCdQNVjAIIXvx8CIuUCWDoQORe2awPQFjsEeDjgkXifBM4uuwPSXaVg4j5w/L45SOpBSGgBe3t04QgPCT0AezqfxedS7d84wYLAUR+0bckHt1eG1tZWEOArLCrl4JtGK+wX8+CteC64iXESeJQLxoxCVaNZI6hmn3KwScGp8AicC9wyB5YF//IL91V2ZjVocRzc7DkM1WQINBwhrLKRFcf3xIdTV1zcLgEunOKzgUOg4euwcF/1AB148BlxuNnVCg5sNevL4IBVdn6NB4rSBLtNvy7LVwaPYP0lsH2neeKwNHMYt/kvQJvCTOS4ylwJ1K8RcJ8LHmFExiMwAg9EEGxRIewzx9sUrJkAV+aFoMRpgGaRv38SBKsgU4SFEzw2xzEBEFEMHCMrjy1NyAlK+OKRI6lbJkjVTDQ4MbWyz0ghx0/2f7R8SjCIQ0SgRFQyLY1Go8X4Nx2o5eKiUdOKxUK839/NeT1dpiiZaQ4KF/sG4L9juSAR+imCJNjWy85IA7+Tg56g4R2ImGM1w8hCBXQqDi6uGdCriOSw7OASo6r+aaKlKWA4CewNI1xI9WGUVuLHvwrwLg3MRBDB7CO8sxN4WTeZvAKhKQVlQ41qyQmfw+T0lOGzFRovRXBQCIoi27ZoAp/QoDwWkMCKCQdKOH48qyoETW9sWpDcum252d19NtqWDGR3QmlKGklqnyTn9x+QamueETPTn7+owpVcbwpwsFc9rV0tmD/JA1V5jsJnPgqsaOxJXhLTrDzKxILa/Y9FTCyXxB0NJczn51a6/ifTLQTo6Q+GFYY2xWsNbbneCuy8mmoDVWhJFJtsT/ZKRFSJI6NFSJ/1TH76zNf3q70PmVogEwE0TEuTA/G236Q7x240QT+NhpjoiadYFQEHKqAdre0N1f8nY2zTUuUxOdO3e8xpdx1q2XpOfkEur6pqXLAvLOENqmp69NkXntEbDy6hoz4Cb9BuVyHl96iOF1ZV2Uwkpse7u6dr9ftvybnthisvO6N6/89f6z4xdrjh9QrJbJ940YrVfc8OB/Q0+3uejN6xbV3w9FzENMe+sSP4q43N0RtvW5h5zaKJ7nW2qLCH4SW8r77pRusjq6kaGPOpFmYrq0xbtTSJJnon6V2vPTo23PCDAjmD1qv9UySsGt2MQ33ni9rYjHkbUxenI0VtIX24kUpcp5zagR7yo8MP3RWMty0SeRceH4N8z4wXnJXzoHn80ODWbVtkrL4wsQJBMEMhX+Dun72t7ambQ1xoPjUNhMKCFqGs7GUEb5tjSu2QfviIYg0PT7IGBy/RDjYvYFXI9nNkZ/UIv71vwXVNBe1v7RpuN030ebh4ndwAMUEIhfU0t1ccnlysvJbvEz6qLZL7mvpUX+ewPqOpV7302LBeBiKxhUUUifb0NYWXXzHD9yanDwKvduWpO5ZspdGOUpswcVCJq2Q3cZWu4pxj6jhvTcIc3OgDU51mRVuW0Wh7LdtPwP2GRG/yRYciayMiZ6GpXzL5qXNLM+atZ2B+Jo9xMgxEmya/smfZdjTUskl1yPZM+Pjs8jvPzvFXmI07huGee39qA8/fe8stEHniD/+V2PDBZZzXyyoQHNOmrnZf+/3zxNKS98E0Dztqa3rx+w4hP2+3cu6iFzi3O6w3NZ/LKtIMBDyewe6K3qlz31zXoi3Hs7rZ4GKacKkJUynOk3f++zkZi8+ucK3yO/n9U4udR3DcmypypA2LJ3pWRlSrpKNfq2EAWjrlt7bE586f6FudLx4JmS0P3mn2b7uIUR4THy5nzjpH5Z0LEIuPiZTdQfy1PZDsbeP8tVuFwiuepdqxGTR6tNxCAH1WUohzkt7O8RxrL2w9TA3D+eNyL3xhlIb+3sIjTXzY+sDDvaG6qQJWPgN9TvmdNxf6pzezM7W19sLmzZtTaqs1NFYmNmz8AQICNJkER82knRmPP/odPj09ru1rAO1gEyTWbwBtbx1oBxrBCobAe+vyR5Tzzn2c7U9cLlD31J87vuXjC0GW4ycnivICueW15SXfqi6Q25DX0KpYkMSVWZaoaoFX5mLPXVN49Xm1njcAPzMAB4J63gNrB++JJC0k5LjKp1Vu5HzVa7i0ce/zuRf8EiE0wIiihiUAwo0AiS6wjq3HLhjUhMJl9yJ3W/gjwxqmyAUNHimrgwEg8Ap0BrYvwHW+iNufVXX9kQO1nxxbt1TE1tXNBBT6Z3w8IW/JGsWRjgY/KxUERvfXdu5aQqMxF3GmTijPnfP75IYP1MjK58Boa7cTgrpjFx7EYVFRUHfuAv3wYRDHj3uJvLeeVRrmRQoZ+3dcpmRNg8RxY0zhe7PTHszyCAPsuGDcBAbIyE+giBxU5TrAg4njpnMyfvdeY/TbuBsPDgKbDob+7f0ZY+89P/PS+xR/x32WHZWRf5F/rPABHBjMtyQTL60hThpYoYNgDt0OfP6SZiL6u6g2VIyKC+l6ODAlZ+Erm3vfeNCB/Ghgrt3V/sxdRf4zNhK7mSmcbJSYaNR1rrpNM6KiA3mQKeq04mt/x/MOSzNi6PXxGKIfNwYCVtNZzMuxbziP29T27e9Wt32cSw1DIpJ0mjLhbtE4oLAYjqlT41h1QbQzfosXwNXdNlP2xuQE81yWCR6vECzPcaxr6VNt0PP9AgxFDfvCLPhne3j4pF+DZvzdwXO7xuVKO5u6kmcC/hZKGNl7u6CqWJ408A0fHq8nEbQGVOpENVUHS1BxMyDe5iGcJNF4h4Atg14iScyul7FDOR+MKKcRbfdMLsp9qsFddUMk2lzGKq59ePOio8ObzyvLXLBWM6NYG4JtRQRehp5Q3fRD/e9cxarOwDbP89a+Lwm+dw4f22QDLAgcODNjqK8OSKpJ5NbBoRLbgiDKaE245JZtbxPkjNOBO1Gr6H8wVej19bgtKDBSkWI8ksMlse54rx3H0l384e5ho7tjULfH1Y65IyUv4uWC2MbAVkhVYZZX2NdE4czROHegWy25eryxBWLN843eD25HQZgDZtJzWrGMToMAkE/7fWQOwR0+GKzJv/jRD5t/+RjjM8Z39V0v3jomY+5aVg4EeUzkFFtx93W9dKuKVSehAhNMUTUFVzzmU/Lt9h0V+IpyHmbPmwLr1mwBASvHBmBEu7FyOdfxz5+d0Rhwp7olQwdiIhj8KPGScAK9nn7yJAAe1xXQAVsZtJOimtPBQbqTD6T6gdkPAsMx3Tk29oefq+1//JU1ek1r5C8vonMVYmhikyB6NKqHkAdjVsoPc0VsfEbzkxn4GCZWrXiyxT/tmmPhfbWs+tqGPvxm2+CmC8qyFr5rUbQEKAy9wb21h/rXLHXY1iQBZZkL/zox7+I16BGBiifuVUJbt2zZ5bBx/XbkZIdDBz1lHLHawvj5t9bQUBy3PxtBtALMpoyOPmdpZm9eqTshuX6GhOYe2cub7xdx1xSzMKfBRKJjWMOWoJDm5NkcYIpnUSj6wkba8XhFnLAs99Wlzr4/nh0nI8gRQUe1XcUpeW8CpxzBXh6kWiApjLnORB9omb0bDS5nlouGG/cgmKV2JbKKTPaBUwvoNUXfffj9Az9aZRsXrL69nc/9pDRj7rus8lgC2X70iTtVPSyxCuQw8s0svfEhh+CB020NRTItr6iCpVdcjKCnp/fp4fB4e+IT/aHr0ovfULfvaNX21iOYLD+eiqGtsE4nyGfNspWWR36LUgEeS7/UHx9QfgJJzc1GfDBilDkEKPA7xW5qiwpAY08Mwkn0+Aja7HI3ZLl5G0gBzfPLO0O1x8uT06DaemU+VhpnA8r2qfzxT/jsxY9ZWEkU1Ra0EO4axlGRsc58wJdeBXzmvDS98U7fyaVOmBkf2gIVZTf/ubFz1Q97w/Vn2sob3DHv6PCWxRPzlqzvDu2deqj/3UsZ1zFLk++buhZv+W+HBzb+3dQtKxJUTMHHFErHbAfDsEfJCoVkfJJ5/t/8AlxXXm6DZKcLBiDyIsu80lmzIf2Rh8B3z12K6/JLs5Urr8jK/84l6QsrHB6qG9YoB4VDhr9r2Fg8s1SBkgwHxrcktqJpT2PFNQvahzS7GnO8AnQP69Mbu5MzmViAxUG2Mx6r8ParujWSbUVnmAiu1VaojqkA7sOsr4nFhRkcK0souQ7Eqnvwt9gMTCLpp0wQsKId/IixiTGl6Hv3s4FkSmtZBuzuWLnCwHPt6Vh5i45cx47jMarVFl51v4IDIglsVtv9qZXqIkwYPw4E9Gt/SW7ecgeeTWA8lvjrez9SFi98XT5nzjBRZMBUgUoXAQ6B5HJyQCwvA0wcELrvgUcSH2y6lshy1GkklLHfvvEmIs2K0fiIWUGQVm4ZvnvJNO9a5Lm+uEZtsEbFg3FhIG5BMQL7/LbAvZaKqDGmUAksnKy+WuiNz0xEYWKKJkwReJeT2DeO1BjvRChCwPkm29aFc5Xj9iQwelb/R6pQToBHWfeGG0CPtuC15qwpSjtjE3q9c1iVoRGeu+7gil8f6l97EWtX1qLlmQvfrcg+d4thal8418NJs76xV543509WDL0TSrDRdnRC8J5frNYPNueyxMH5fMD5Uf3xL5+eBlYgAJHHn/xx4r31N2LORbUe9Atez5G6jImbaFI/4T4RvNauZMVFj7W/VdeRqHAjMCKLTogcW9lnNM6+657r+tO6fZGLbOAwomVnCh13XFByN5WK2+0gwLjLUBUabrgpVUb8iGey7EkDrEisvm5Z23/bE9bg1gWnTLLRlMiQeBD4YB3wgheml1z/a7QlNJUyKL+v+6W7DSuZxvbFTGvNLv/Rg24pB1xSJq5Zn7sKrBUxMazQWw9PNj5prSWKwpLEfLO7p06orHiK83o2oucLkFhc1CKRKr3x4PfNox2LRr0h2hxLWr78HiWtqp/bfVS2Rm4ao1iPyhPlUEdi5v0BbXd1ofIiKuo6t0wGseLcb+8Lz97fmfx+36BWDA7Ojl+EJ9oDl2XfVlsm9Rv8dU/D4A/Pt0HCgTDan/sxCews5tJmPAlGpAfMBKWJbg8mi5lWYPdNVrS3msi+IeLwBdH7laU8kQc47yTkvThIaKxVzKklaWf+DfPt6y3H1l7ClJWzyZ6AbiUBBWS1yLs3dwb2fKkZRsLenrGpKHXrtqzIUyuf1ZsPXWDPXI7MWNicx6eAYqpMR+01iwMZ6QMZV19+7Uc157/z5H4oXLNruCmpodoiwZfmSn+cN9H90ut7wn8OBfXMlEcceafBTmGOXGPEgvi8Qt/tizKv/u6stA+KfCZylAZq3fUrzK5XH7AtCjfyPMSeyzLYfB0qh8jMHLslTvaHUHkvNAO7LrH6PrzNLlJXQZNQcftk1FfdQC8XyJiFY+5EZa8/Y03DrVuw+gSWKmw/QC26cNx9Z2W4yrYxg/xlFv4XP2VEa2BmDcQdlZV/5vNyt9KkKuN32QiCk1oW5jNttMrwJuUEn59XL02pfdh54bduFGpq6o+ADyxBcvVH9HEZXqHN7xU6a4uV9zH4r67MkVa5nHw8rNOCuE6x72nqxQdWE1YazfGLrVNLlUeWzvBfO61EafTIAmS6MO1YMQQ4uZXzVmNwVbOQ6/LRJ0g2UtRiUyw8a2kipfVwaZOfEUpv/C7nGddAE+05hFg+omS3ECXvIO+b/Fe8aZNwPJjOQjbvh+ev7B6OH5nUH2mYyIyzjtGrKveCl2eW3PAo84GKmPalVmJGorZvw1gGNBwGCwkfjTOYwaDfGhgqtwYH8oRJE71G6xGNc7kGkAPbhKKCTmqYFidjCikqhsi4GoiYPLy2K2i/GTPxASuyJZYaYPfROHgVHi2KJaPCVh05po0tzXK4WvrVWJpTaKstkptVgyaZ10OgobpAgaosC3gzDEbXy1itHlsArODePJroGg+cmA1ShkCDdRHOXdVNlKJm4J1RgsEdI1rKxjBetNsdRc4/PfUeFo1wCIHiMY4l9EDWOw3LtwfjHWM5HACek5JXzXz9zBxPdT3y3z84DT/amriiSQ5ymRm7mUTKs84ElVULjh77TJnxRZNMUWBYNzGHktDZew2aAg9/163UjDHrziQKARZassAn7sMQsm9epdt+Ac7eZ3D29JXF8u1nGPLUjBwqbS8o+b1ELsB2LEXK60HDlZt6l8HaDJNCamJUZ2Q0IijoPpDnVAQohsIi4N0yq1HX9cItg9GWsRIOjIZcODZrwes+pag+ovb9c+8wTk4RwOIWtjQzxsga+AA09bIFvvpbMHtcRkBlsY2BzOyjRU9xFp+zMED0FFAmVgdF2rOYP/3suTmCALJfVTkHWIUJeO+RZG/BgZ6/3MDakymuJHgTZZnzH+gO7jnlvwn+OfD+xReClchmS2JoOZIINMdeIyBn7+p4+o6o2pfDlFbDFp+Uu/T5MRlzGnQj/s+/PfvXX5jYYKuKXoh6qzGwOFJA4t/B6CcTDvWtuZ4nDrvKZNGfQN/3hAd9nSGq/w8e4wDVX4vrNPtfQHibA3lgbdrU9+aVlqWbiujvxjThrs6/ZGWOt7qBTXT+I8v/CjAAJOOJ0FaTyhsAAAAASUVORK5CYII=);}';
                var actual = writerTracker.getCodeForFilename('testPage-4b7673cd.css');
                // console.log(actual);
                expect(actual).to.equal(expected);
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for image URLs in CSS files to be resolved when bundling is disabled', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            bundlingEnabled: false,
            resolveCssUrls: true
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'css-url-transform'
                    }],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
                expect(writerTracker.getOutputPaths()).to.deep.equal( [
                    path.join(__dirname, 'build/src/css-url-transform/css-url-transform.css').replace(/\\/g, '/'),
                    path.join(__dirname, 'build/src/css-url-transform/ebay-logo.png').replace(/\\/g, '/')
                ] );
                var expected = '.test-1 {background-image: url(ebay-logo.png);}\n.test-2 {background-image: url(ebay-logo.png);}\n.test-3 {background-image: url(ebay-logo.png);}\n.test-4 {background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAeCAYAAABt5kPUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNzdGMTE3NDA3MjA2ODExODhDNkIzODA1MTg5Nzc0NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRTg2MEMyMzZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRTg2MEMyMjZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAyODAxMTc0MDcyMDY4MTE5OTRDOTI2RkUxMEEyMEJFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3N0YxMTc0MDcyMDY4MTE4OEM2QjM4MDUxODk3NzQ2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Yff30gAAE/BJREFUeNrsWgdwHdW5/s+Wu7u3q3fJspqLLMuVYINt3AgQwjPFYCCN+ogpLyRgCKQHAo/H8OAFhgAOxQQCDt3E2Bg74IK7ZMuyZCFbVpescnvZet5/9kpuhJbMvJkwb2d2tPferd/5/6+cFTHDESCiAPrBZjD7+oBqOpjHjoE5MACEFwAoBbZwGekgDh2D95QJ8HthGsjUAAKpheCGYYJ3b0fibwmd5nIERPx6A67L4KRF1SlU5jhgdrkTMj0C9IcN0A0K00oUEHkCPicP51S5QBIIuPg48Byet3OVfQ/UiADoIaBmDAjnAOCdQNVjAIIXvx8CIuUCWDoQORe2awPQFjsEeDjgkXifBM4uuwPSXaVg4j5w/L45SOpBSGgBe3t04QgPCT0AezqfxedS7d84wYLAUR+0bckHt1eG1tZWEOArLCrl4JtGK+wX8+CteC64iXESeJQLxoxCVaNZI6hmn3KwScGp8AicC9wyB5YF//IL91V2ZjVocRzc7DkM1WQINBwhrLKRFcf3xIdTV1zcLgEunOKzgUOg4euwcF/1AB148BlxuNnVCg5sNevL4IBVdn6NB4rSBLtNvy7LVwaPYP0lsH2neeKwNHMYt/kvQJvCTOS4ylwJ1K8RcJ8LHmFExiMwAg9EEGxRIewzx9sUrJkAV+aFoMRpgGaRv38SBKsgU4SFEzw2xzEBEFEMHCMrjy1NyAlK+OKRI6lbJkjVTDQ4MbWyz0ghx0/2f7R8SjCIQ0SgRFQyLY1Go8X4Nx2o5eKiUdOKxUK839/NeT1dpiiZaQ4KF/sG4L9juSAR+imCJNjWy85IA7+Tg56g4R2ImGM1w8hCBXQqDi6uGdCriOSw7OASo6r+aaKlKWA4CewNI1xI9WGUVuLHvwrwLg3MRBDB7CO8sxN4WTeZvAKhKQVlQ41qyQmfw+T0lOGzFRovRXBQCIoi27ZoAp/QoDwWkMCKCQdKOH48qyoETW9sWpDcum252d19NtqWDGR3QmlKGklqnyTn9x+QamueETPTn7+owpVcbwpwsFc9rV0tmD/JA1V5jsJnPgqsaOxJXhLTrDzKxILa/Y9FTCyXxB0NJczn51a6/ifTLQTo6Q+GFYY2xWsNbbneCuy8mmoDVWhJFJtsT/ZKRFSJI6NFSJ/1TH76zNf3q70PmVogEwE0TEuTA/G236Q7x240QT+NhpjoiadYFQEHKqAdre0N1f8nY2zTUuUxOdO3e8xpdx1q2XpOfkEur6pqXLAvLOENqmp69NkXntEbDy6hoz4Cb9BuVyHl96iOF1ZV2Uwkpse7u6dr9ftvybnthisvO6N6/89f6z4xdrjh9QrJbJ940YrVfc8OB/Q0+3uejN6xbV3w9FzENMe+sSP4q43N0RtvW5h5zaKJ7nW2qLCH4SW8r77pRusjq6kaGPOpFmYrq0xbtTSJJnon6V2vPTo23PCDAjmD1qv9UySsGt2MQ33ni9rYjHkbUxenI0VtIX24kUpcp5zagR7yo8MP3RWMty0SeRceH4N8z4wXnJXzoHn80ODWbVtkrL4wsQJBMEMhX+Dun72t7ambQ1xoPjUNhMKCFqGs7GUEb5tjSu2QfviIYg0PT7IGBy/RDjYvYFXI9nNkZ/UIv71vwXVNBe1v7RpuN030ebh4ndwAMUEIhfU0t1ccnlysvJbvEz6qLZL7mvpUX+ewPqOpV7302LBeBiKxhUUUifb0NYWXXzHD9yanDwKvduWpO5ZspdGOUpswcVCJq2Q3cZWu4pxj6jhvTcIc3OgDU51mRVuW0Wh7LdtPwP2GRG/yRYciayMiZ6GpXzL5qXNLM+atZ2B+Jo9xMgxEmya/smfZdjTUskl1yPZM+Pjs8jvPzvFXmI07huGee39qA8/fe8stEHniD/+V2PDBZZzXyyoQHNOmrnZf+/3zxNKS98E0Dztqa3rx+w4hP2+3cu6iFzi3O6w3NZ/LKtIMBDyewe6K3qlz31zXoi3Hs7rZ4GKacKkJUynOk3f++zkZi8+ucK3yO/n9U4udR3DcmypypA2LJ3pWRlSrpKNfq2EAWjrlt7bE586f6FudLx4JmS0P3mn2b7uIUR4THy5nzjpH5Z0LEIuPiZTdQfy1PZDsbeP8tVuFwiuepdqxGTR6tNxCAH1WUohzkt7O8RxrL2w9TA3D+eNyL3xhlIb+3sIjTXzY+sDDvaG6qQJWPgN9TvmdNxf6pzezM7W19sLmzZtTaqs1NFYmNmz8AQICNJkER82knRmPP/odPj09ru1rAO1gEyTWbwBtbx1oBxrBCobAe+vyR5Tzzn2c7U9cLlD31J87vuXjC0GW4ycnivICueW15SXfqi6Q25DX0KpYkMSVWZaoaoFX5mLPXVN49Xm1njcAPzMAB4J63gNrB++JJC0k5LjKp1Vu5HzVa7i0ce/zuRf8EiE0wIiihiUAwo0AiS6wjq3HLhjUhMJl9yJ3W/gjwxqmyAUNHimrgwEg8Ap0BrYvwHW+iNufVXX9kQO1nxxbt1TE1tXNBBT6Z3w8IW/JGsWRjgY/KxUERvfXdu5aQqMxF3GmTijPnfP75IYP1MjK58Boa7cTgrpjFx7EYVFRUHfuAv3wYRDHj3uJvLeeVRrmRQoZ+3dcpmRNg8RxY0zhe7PTHszyCAPsuGDcBAbIyE+giBxU5TrAg4njpnMyfvdeY/TbuBsPDgKbDob+7f0ZY+89P/PS+xR/x32WHZWRf5F/rPABHBjMtyQTL60hThpYoYNgDt0OfP6SZiL6u6g2VIyKC+l6ODAlZ+Erm3vfeNCB/Ghgrt3V/sxdRf4zNhK7mSmcbJSYaNR1rrpNM6KiA3mQKeq04mt/x/MOSzNi6PXxGKIfNwYCVtNZzMuxbziP29T27e9Wt32cSw1DIpJ0mjLhbtE4oLAYjqlT41h1QbQzfosXwNXdNlP2xuQE81yWCR6vECzPcaxr6VNt0PP9AgxFDfvCLPhne3j4pF+DZvzdwXO7xuVKO5u6kmcC/hZKGNl7u6CqWJ408A0fHq8nEbQGVOpENVUHS1BxMyDe5iGcJNF4h4Atg14iScyul7FDOR+MKKcRbfdMLsp9qsFddUMk2lzGKq59ePOio8ObzyvLXLBWM6NYG4JtRQRehp5Q3fRD/e9cxarOwDbP89a+Lwm+dw4f22QDLAgcODNjqK8OSKpJ5NbBoRLbgiDKaE245JZtbxPkjNOBO1Gr6H8wVej19bgtKDBSkWI8ksMlse54rx3H0l384e5ho7tjULfH1Y65IyUv4uWC2MbAVkhVYZZX2NdE4czROHegWy25eryxBWLN843eD25HQZgDZtJzWrGMToMAkE/7fWQOwR0+GKzJv/jRD5t/+RjjM8Z39V0v3jomY+5aVg4EeUzkFFtx93W9dKuKVSehAhNMUTUFVzzmU/Lt9h0V+IpyHmbPmwLr1mwBASvHBmBEu7FyOdfxz5+d0Rhwp7olQwdiIhj8KPGScAK9nn7yJAAe1xXQAVsZtJOimtPBQbqTD6T6gdkPAsMx3Tk29oefq+1//JU1ek1r5C8vonMVYmhikyB6NKqHkAdjVsoPc0VsfEbzkxn4GCZWrXiyxT/tmmPhfbWs+tqGPvxm2+CmC8qyFr5rUbQEKAy9wb21h/rXLHXY1iQBZZkL/zox7+I16BGBiifuVUJbt2zZ5bBx/XbkZIdDBz1lHLHawvj5t9bQUBy3PxtBtALMpoyOPmdpZm9eqTshuX6GhOYe2cub7xdx1xSzMKfBRKJjWMOWoJDm5NkcYIpnUSj6wkba8XhFnLAs99Wlzr4/nh0nI8gRQUe1XcUpeW8CpxzBXh6kWiApjLnORB9omb0bDS5nlouGG/cgmKV2JbKKTPaBUwvoNUXfffj9Az9aZRsXrL69nc/9pDRj7rus8lgC2X70iTtVPSyxCuQw8s0svfEhh+CB020NRTItr6iCpVdcjKCnp/fp4fB4e+IT/aHr0ovfULfvaNX21iOYLD+eiqGtsE4nyGfNspWWR36LUgEeS7/UHx9QfgJJzc1GfDBilDkEKPA7xW5qiwpAY08Mwkn0+Aja7HI3ZLl5G0gBzfPLO0O1x8uT06DaemU+VhpnA8r2qfzxT/jsxY9ZWEkU1Ra0EO4axlGRsc58wJdeBXzmvDS98U7fyaVOmBkf2gIVZTf/ubFz1Q97w/Vn2sob3DHv6PCWxRPzlqzvDu2deqj/3UsZ1zFLk++buhZv+W+HBzb+3dQtKxJUTMHHFErHbAfDsEfJCoVkfJJ5/t/8AlxXXm6DZKcLBiDyIsu80lmzIf2Rh8B3z12K6/JLs5Urr8jK/84l6QsrHB6qG9YoB4VDhr9r2Fg8s1SBkgwHxrcktqJpT2PFNQvahzS7GnO8AnQP69Mbu5MzmViAxUG2Mx6r8ParujWSbUVnmAiu1VaojqkA7sOsr4nFhRkcK0souQ7Eqnvwt9gMTCLpp0wQsKId/IixiTGl6Hv3s4FkSmtZBuzuWLnCwHPt6Vh5i45cx47jMarVFl51v4IDIglsVtv9qZXqIkwYPw4E9Gt/SW7ecgeeTWA8lvjrez9SFi98XT5nzjBRZMBUgUoXAQ6B5HJyQCwvA0wcELrvgUcSH2y6lshy1GkklLHfvvEmIs2K0fiIWUGQVm4ZvnvJNO9a5Lm+uEZtsEbFg3FhIG5BMQL7/LbAvZaKqDGmUAksnKy+WuiNz0xEYWKKJkwReJeT2DeO1BjvRChCwPkm29aFc5Xj9iQwelb/R6pQToBHWfeGG0CPtuC15qwpSjtjE3q9c1iVoRGeu+7gil8f6l97EWtX1qLlmQvfrcg+d4thal8418NJs76xV543509WDL0TSrDRdnRC8J5frNYPNueyxMH5fMD5Uf3xL5+eBlYgAJHHn/xx4r31N2LORbUe9Atez5G6jImbaFI/4T4RvNauZMVFj7W/VdeRqHAjMCKLTogcW9lnNM6+657r+tO6fZGLbOAwomVnCh13XFByN5WK2+0gwLjLUBUabrgpVUb8iGey7EkDrEisvm5Z23/bE9bg1gWnTLLRlMiQeBD4YB3wgheml1z/a7QlNJUyKL+v+6W7DSuZxvbFTGvNLv/Rg24pB1xSJq5Zn7sKrBUxMazQWw9PNj5prSWKwpLEfLO7p06orHiK83o2oucLkFhc1CKRKr3x4PfNox2LRr0h2hxLWr78HiWtqp/bfVS2Rm4ao1iPyhPlUEdi5v0BbXd1ofIiKuo6t0wGseLcb+8Lz97fmfx+36BWDA7Ojl+EJ9oDl2XfVlsm9Rv8dU/D4A/Pt0HCgTDan/sxCews5tJmPAlGpAfMBKWJbg8mi5lWYPdNVrS3msi+IeLwBdH7laU8kQc47yTkvThIaKxVzKklaWf+DfPt6y3H1l7ClJWzyZ6AbiUBBWS1yLs3dwb2fKkZRsLenrGpKHXrtqzIUyuf1ZsPXWDPXI7MWNicx6eAYqpMR+01iwMZ6QMZV19+7Uc157/z5H4oXLNruCmpodoiwZfmSn+cN9H90ut7wn8OBfXMlEcceafBTmGOXGPEgvi8Qt/tizKv/u6stA+KfCZylAZq3fUrzK5XH7AtCjfyPMSeyzLYfB0qh8jMHLslTvaHUHkvNAO7LrH6PrzNLlJXQZNQcftk1FfdQC8XyJiFY+5EZa8/Y03DrVuw+gSWKmw/QC26cNx9Z2W4yrYxg/xlFv4XP2VEa2BmDcQdlZV/5vNyt9KkKuN32QiCk1oW5jNttMrwJuUEn59XL02pfdh54bduFGpq6o+ADyxBcvVH9HEZXqHN7xU6a4uV9zH4r67MkVa5nHw8rNOCuE6x72nqxQdWE1YazfGLrVNLlUeWzvBfO61EafTIAmS6MO1YMQQ4uZXzVmNwVbOQ6/LRJ0g2UtRiUyw8a2kipfVwaZOfEUpv/C7nGddAE+05hFg+omS3ECXvIO+b/Fe8aZNwPJjOQjbvh+ev7B6OH5nUH2mYyIyzjtGrKveCl2eW3PAo84GKmPalVmJGorZvw1gGNBwGCwkfjTOYwaDfGhgqtwYH8oRJE71G6xGNc7kGkAPbhKKCTmqYFidjCikqhsi4GoiYPLy2K2i/GTPxASuyJZYaYPfROHgVHi2KJaPCVh05po0tzXK4WvrVWJpTaKstkptVgyaZ10OgobpAgaosC3gzDEbXy1itHlsArODePJroGg+cmA1ShkCDdRHOXdVNlKJm4J1RgsEdI1rKxjBetNsdRc4/PfUeFo1wCIHiMY4l9EDWOw3LtwfjHWM5HACek5JXzXz9zBxPdT3y3z84DT/amriiSQ5ymRm7mUTKs84ElVULjh77TJnxRZNMUWBYNzGHktDZew2aAg9/163UjDHrziQKARZassAn7sMQsm9epdt+Ac7eZ3D29JXF8u1nGPLUjBwqbS8o+b1ELsB2LEXK60HDlZt6l8HaDJNCamJUZ2Q0IijoPpDnVAQohsIi4N0yq1HX9cItg9GWsRIOjIZcODZrwes+pag+ovb9c+8wTk4RwOIWtjQzxsga+AA09bIFvvpbMHtcRkBlsY2BzOyjRU9xFp+zMED0FFAmVgdF2rOYP/3suTmCALJfVTkHWIUJeO+RZG/BgZ6/3MDakymuJHgTZZnzH+gO7jnlvwn+OfD+xReClchmS2JoOZIINMdeIyBn7+p4+o6o2pfDlFbDFp+Uu/T5MRlzGnQj/s+/PfvXX5jYYKuKXoh6qzGwOFJA4t/B6CcTDvWtuZ4nDrvKZNGfQN/3hAd9nSGq/w8e4wDVX4vrNPtfQHibA3lgbdrU9+aVlqWbiujvxjThrs6/ZGWOt7qBTXT+I8v/CjAAJOOJ0FaTyhsAAAAASUVORK5CYII=);}';
                var actual = writerTracker.getCodeForFilename('css-url-transform.css');
                // console.log(actual);
                expect(actual).to.equal(expected);
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow resolving URLs via require pseudo protocol', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            outputDir: outputDir,
            fingerprintsEnabled: true,
            resolveCssUrls: true
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'css-url-transform/require-test.browser.json'
                    }],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'ebay-logo-d481eb85.png',
                    'testPage-4b7673cd.css'
                ] );
                var expected = '.test-1 {background-image: url(ebay-logo-d481eb85.png);}\n.test-2 {background-image: url(ebay-logo-d481eb85.png);}\n.test-3 {background-image: url(ebay-logo-d481eb85.png);}\n.test-4 {background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAeCAYAAABt5kPUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNzdGMTE3NDA3MjA2ODExODhDNkIzODA1MTg5Nzc0NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRTg2MEMyMzZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRTg2MEMyMjZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAyODAxMTc0MDcyMDY4MTE5OTRDOTI2RkUxMEEyMEJFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3N0YxMTc0MDcyMDY4MTE4OEM2QjM4MDUxODk3NzQ2Ii8+IDwvcmRmOkRlc2NyaXB0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);}';
                var actual = writerTracker.getCodeForFilename('testPage-4b7673cd.css');
                // console.log(actual);
                expect(actual).to.equal(expected);
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow custom CSS url resolver', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            outputDir: outputDir,
            fingerprintsEnabled: true,
            resolveCssUrls: {
                urlResolver: function(url, lassoContext, callback) {
                    url = url.replace('SOME_DIR', path.join(__dirname, 'src/css-url-transform'));
                    url = url.replace('MYCOMPANY', 'ebay');
                    callback(null, url);
                }
            }
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        'package': 'css-url-transform/custom-resolver.browser.json'
                    }],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                    'ebay-logo-d481eb85.png',
                    'testPage-4b7673cd.css'
                ] );
                var expected = '.test-1 {background-image: url(ebay-logo-d481eb85.png);}\n.test-2 {background-image: url(ebay-logo-d481eb85.png);}\n.test-3 {background-image: url(ebay-logo-d481eb85.png);}\n.test-4 {background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAeCAYAAABt5kPUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNzdGMTE3NDA3MjA2ODExODhDNkIzODA1MTg5Nzc0NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRTg2MEMyMzZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRTg2MEMyMjZFNzIxMUUyQjZGMEE2ODM0MDRENkNFNiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAyODAxMTc0MDcyMDY4MTE5OTRDOTI2RkUxMEEyMEJFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3N0YxMTc0MDcyMDY4MTE4OEM2QjM4MDUxODk3NzQ2Ii8+IDwvcmRmOkRlc2NyaXB0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);}';
                var actual = writerTracker.getCodeForFilename('testPage-4b7673cd.css');
                // console.log(actual);
                expect(actual).to.equal(expected);
                lasso.flushAllCaches(done);
            })
            .done();
    });
    it('should allow for external resource URLs', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            flags: ['jquery', 'browser'],
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            bundles: []
        }, __dirname, __filename);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    'js: http://code.jquery.com/jquery-1.11.0.min.js'
                ],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log('OPTIMIZED PAGE: ', lassoPageResult);
                expect(lassoPageResult.getBodyHtml()).to.equal('<script type="text/javascript" src="http://code.jquery.com/jquery-1.11.0.min.js"></script>');
                expect(lassoPageResult.getHeadHtml()).to.equal('');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for external resource URLs to be inlined', function(done) {
        this.timeout(5000);
        var lasso = require('../');
        var theLasso = lasso.create({
            flags: [],
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: true
            },
            bundlingEnabled: true
        }, __dirname, __filename);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        type: 'js',
                        url: 'http://code.jquery.com/jquery-1.11.0.min.js',
                        external: false
                    }
                ],
                from: module
            }, function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }
                expect(lassoPageResult.getBodyHtml()).to.equal('<script type="text/javascript" src="/static/testPage-b66ed708.js"></script>');
                expect(lassoPageResult.getHeadHtml()).to.equal('');
                lasso.flushAllCaches(done);
            });
    });

    it('should lasso a page that has an installed module that uses async loading', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: path.join(__dirname, 'test-async-project2').replace(/\\/g, '/')
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getOutputFilenames()).to.deep.equal( [
                        'testPage-async.js',
                        'testPage.js'
                    ] );

                var asyncCode = writerTracker.getCodeForFilename('testPage-async.js');
                var syncCode = writerTracker.getCodeForFilename('testPage.js');

                expect(syncCode).to.contain('testPage-async.js');
                expect(syncCode).to.contain('$rloaderMeta');
                expect(syncCode).to.contain('FOO');
                expect(syncCode).to.contain('MAIN');
                expect(syncCode).to.not.contain('BAR');
                expect(asyncCode).to.contain('BAR');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for resource dependencies to be an absolute path', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundlingEnabled: true,
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'src/main.js').replace(/\\/g, '/')
                ],
                from: module
            })
            .then(function(lassoPageResult) {
                // console.log(writerTracker.getOutputFilenames());
                // console.log(writerTracker.getCodeForFilename('testPage-body.js'));
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal("console.log('MAIN');\n");
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for glob patterns', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: 'lasso-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './browser.json'
                ],
                from: path.join(__dirname, 'test-project-globs').replace(/\\/g, '/')
            }, function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                expect(writerTracker.getCodeForFilename('testPage.css')).to.equal(".style1 {}\n.style2 {}");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("FOO");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("BAR");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("$rmod.def");

                done();
            });
    });

    it('should allow for glob patterns with relative paths', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: 'lasso-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './relative-paths.browser.json'
                ],
                from: path.join(__dirname, 'test-project-globs').replace(/\\/g, '/')
            }, function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                expect(writerTracker.getCodeForFilename('testPage.css')).to.equal(".style1 {}\n.style2 {}");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("FOO");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("BAR");
                expect(writerTracker.getCodeForFilename('testPage.js')).to.contain("$rmod.def");

                done();
            });
    });

    it('should generate unique filenames for non-file dependencies when bundling is disabled', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: false,
            plugins: [
                {
                    plugin: function(lasso, config) {
                        lasso.dependencies.registerJavaScriptType('foo', {
                            properties: {
                            },

                            init: function(lassoContext, callback) {
                                callback();
                            },

                            read: function(lassoContext, callback) {
                                callback(null, 'FOO');
                            }
                        });
                    }
                }
            ]
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {type: 'foo'}
                ],
                from: module
            }, function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                expect(writerTracker.getCodeForFilename('foo-testPage.js')).to.equal("FOO");

                done();
            });
    });

    it('should support pulling out common dependencies into a separate bundle', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            plugins: [
            ],
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            'intersection': [
                                path.join(__dirname, 'fixtures/code-splitting/page1.browser.json'),
                                path.join(__dirname, 'fixtures/code-splitting/page2.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);

        series(
            [
                function(callback) {
                    writerTracker.reset();
                    theLasso.lassoPage({
                            pageName: 'page1',
                            dependencies: [
                                path.join(__dirname, 'fixtures/code-splitting/page1.browser.json')
                            ],
                            from: module
                        }, function(err, lassoPageResult) {
                            if (err) {
                                return callback(err);
                            }

                            expect(writerTracker.getCodeForFilename('page1.js')).to.equal("FOO");

                            expect(writerTracker.getOutputFilenames()).to.deep.equal([
                                    'common.js',
                                    'page1.js'
                                ]);

                            expect(writerTracker.getCodeForFilename('common.js')).to.equal("COMMON");

                            callback();
                        });
                },
                function(callback) {
                    writerTracker.reset();
                    theLasso.lassoPage({
                            pageName: 'page2',
                            dependencies: [
                                path.join(__dirname, 'fixtures/code-splitting/page2.browser.json')
                            ],
                            from: module
                        }, function(err, lassoPageResult) {
                            if (err) {
                                return callback(err);
                            }

                            expect(writerTracker.getCodeForFilename('page2.js')).to.equal("BAR");

                            expect(writerTracker.getOutputFilenames()).to.deep.equal([
                                    'common.js',
                                    'page2.js'
                                ]);

                            expect(writerTracker.getCodeForFilename('common.js')).to.equal("COMMON");

                            callback();
                        });
                }
            ],
            done
        );
    });

    it('should finding intersection of dependencies with 100 percent threshold', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            threshold: '100%',
                            intersection: [
                                // a.js is found in 2/3 (100%)
                                // b.js is found in 2/3 (66.6%)
                                // c.js if found in 1/3 (33.3%)
                                path.join(__dirname, 'test-intersection-project/a.browser.json'),
                                path.join(__dirname, 'test-intersection-project/ab.browser.json'),
                                path.join(__dirname, 'test-intersection-project/abc.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'test-intersection-project/abc.browser.json')
                ],
                from: path.join(__dirname, 'test-intersection-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'common.js',
                    'testPage.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('b=true;\nc=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should finding strict intersection of dependencies with numeric threshold', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            threshold: 3,
                            intersection: [
                                // a.js is found in 2/3 (100%)
                                // b.js is found in 2/3 (66.6%)
                                // c.js if found in 1/3 (33.3%)
                                path.join(__dirname, 'test-intersection-project/a.browser.json'),
                                path.join(__dirname, 'test-intersection-project/ab.browser.json'),
                                path.join(__dirname, 'test-intersection-project/abc.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'test-intersection-project/abc.browser.json')
                ],
                from: path.join(__dirname, 'test-intersection-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'common.js',
                    'testPage.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('b=true;\nc=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should finding non-strict intersection of dependencies with numeric threshold', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            threshold: 2,
                            intersection: [
                                // a.js is found in 2/3 (100%)
                                // b.js is found in 2/3 (66.6%)
                                // c.js if found in 1/3 (33.3%)
                                path.join(__dirname, 'test-intersection-project/a.browser.json'),
                                path.join(__dirname, 'test-intersection-project/ab.browser.json'),
                                path.join(__dirname, 'test-intersection-project/abc.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'test-intersection-project/abc.browser.json')
                ],
                from: path.join(__dirname, 'test-intersection-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'common.js',
                    'testPage.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;\nb=true;');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('c=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should finding non-strict intersection of dependencies with string threshold', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            threshold: '2',
                            intersection: [
                                // a.js is found in 2/3 (100%)
                                // b.js is found in 2/3 (66.6%)
                                // c.js if found in 1/3 (33.3%)
                                path.join(__dirname, 'test-intersection-project/a.browser.json'),
                                path.join(__dirname, 'test-intersection-project/ab.browser.json'),
                                path.join(__dirname, 'test-intersection-project/abc.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'test-intersection-project/abc.browser.json')
                ],
                from: path.join(__dirname, 'test-intersection-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'common.js',
                    'testPage.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;\nb=true;');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('c=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should finding strict intersection of dependencies with percentage threshold', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            bundles: [
                {
                    name: 'common',
                    dependencies: [
                        {
                            threshold: '50%',
                            intersection: [
                                // a.js is found in 2/3 (66.6%)
                                // b.js is found in 2/3 (66.6%)
                                // c.js if found in 1/3 (33.3%)
                                path.join(__dirname, 'test-intersection-project/a.browser.json'),
                                path.join(__dirname, 'test-intersection-project/ab.browser.json'),
                                path.join(__dirname, 'test-intersection-project/bc.browser.json')
                            ]
                        }
                    ]
                }
            ]
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'test-intersection-project/abc.browser.json')
                ],
                from: path.join(__dirname, 'test-intersection-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'common.js',
                    'testPage.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;\nb=true;');
                expect(writerTracker.getCodeForFilename('testPage.js')).to.equal('c=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should resolve font URLs correctly', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/static',
                fingerprintsEnabled: true
            },
            flags: [],
            bundlingEnabled: true,
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    path.join(__dirname, 'fixtures/fonts/fonts.css').replace(/\\/g, '/')
                ],
                from: module
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getCodeForFilename('testPage-0f710bcd.css')).to.equal("@font-face { src: url(Aleo-Regular-6be64eb6.woff); }");
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should resolve font URLs correctly inside pre-processed CSS files', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/static',
                fingerprintsEnabled: true
            },
            plugins: [
                {
                    plugin: function(theLasso) {
                        theLasso.dependencies.registerStyleSheetType('foo', {
                            properties: {
                                'path': 'string'
                            },

                            init: function(lassoContext, callback) {
                                this.path = this.resolvePath(this.path);
                                callback();
                            },

                            read: function(lassoContext, callback) {
                                var path = this.path;

                                require('fs').readFile(path, {encoding: 'utf8'}, function(err, css) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    callback(null, css);
                                });
                            },

                            getSourceFile: function() {
                                return this.path;
                            },

                            getLastModified: function(lassoContext, callback) {
                                return callback(null, -1);
                            }
                        });
                    }
                }
            ],
            flags: [],
            bundlingEnabled: true,
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {
                        type: 'foo',
                        path: path.join(__dirname, 'fixtures/fonts/fonts.css').replace(/\\/g, '/')
                    }
                ],
                from: module
            }, function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'Aleo-Regular-6be64eb6.woff',
                        'testPage-0f710bcd.css'
                    ]);

                expect(writerTracker.getCodeForFilename('testPage-0f710bcd.css')).to.equal("@font-face { src: url(Aleo-Regular-6be64eb6.woff); }");
                lasso.flushAllCaches(done);
            });
    });

    it('should allow for inline "end" dependencies', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            }
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {path: './src/moduleA/moduleA.js', inline: 'end'},
                    './src/moduleB/moduleB.js',
                ],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal(['testPage.js']);
                expect(body).to.equal('<script type=\"text/javascript\" src=\"/testPage.js\"></script>\n<script type=\"text/javascript\">moduleA_js</script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for inline true dependencies', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            }
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {path: './src/moduleA/moduleA.js', inline: true},
                    './src/moduleB/moduleB.js',
                ],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal(['testPage.js']);
                expect(body).to.equal('<script type=\"text/javascript\" src=\"/testPage.js\"></script>\n<script type=\"text/javascript\">moduleA_js</script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for inline false dependencies', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            }
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {path: './src/moduleA/moduleA.js', inline: false},
                    './src/moduleB/moduleB.js'
                ],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal(['testPage.js']);
                expect(body).to.equal('<script type=\"text/javascript\" src=\"/testPage.js\"></script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for inline "beginning" dependencies', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            }
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {path: './src/moduleA/moduleA.js', inline: 'beginning'},
                    './src/moduleB/moduleB.js',
                ],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal(['testPage.js']);
                expect(body).to.equal('<script type=\"text/javascript\">moduleA_js</script>\n<script type=\"text/javascript\" src=\"/testPage.js\"></script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for inline "in-place" dependencies', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: false
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './src/moduleA/moduleA.js',
                    {path: './src/moduleB/moduleB.js', inline: 'in-place'},
                    './src/moduleC/moduleC.js'
                ],
                from: module,
                basePath: __dirname
            })
            .then(function(lassoPageResult) {
				var body = lassoPageResult.getSlotHtml('body').replace(/\\/g, "/");
                expect(writerTracker.getOutputFilenames()).to.deep.equal(['moduleA.js', 'moduleC.js']);
                expect(body).to.equal('<script type=\"text/javascript\" src=\"/src/moduleA/moduleA.js\"></script>\n<script type=\"text/javascript\">moduleB_js</script>\n<script type=\"text/javascript\" src=\"/src/moduleC/moduleC.js\"></script>');
                lasso.flushAllCaches(done);
            })
            .done();
    });
});
