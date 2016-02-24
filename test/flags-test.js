'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var util = require('./util');
var outputDir = nodePath.join(__dirname, 'build');

require('app-module-path').addPath(nodePath.join(__dirname, 'src'));
describe('lasso flags', function() {
    beforeEach(function(done) {
        util.rmdirRecursive(outputDir);
        require('../').clearCaches();
        require('raptor-promises').enableLongStacks();
        require('raptor-logging').configureLoggers({
            'lasso': 'WARN',
            'raptor-cache': 'WARN'
        });
        done();
    });
    it('should allow for optimizing a page with flags', function(done) {
        var lasso = require('../');
        var myLasso = lasso.create({
            outputDir: outputDir,
            urlPrefix: '/',
            fingerprintsEnabled: false,
            flags: ['a'],
            bundlingEnabled: false
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(myLasso.writer);
        myLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './browser.json'
                ],
                from: nodePath.join(__dirname, 'test-flags-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    // a.js only included if "a" flag is enabled
                    'a.js',

                    /* NOTE: b.js should not be included because it requires flag "b" */
                    // 'a.js'

                    // c.js is always included (not conditional)
                    'c.js',
                    'desktop-a.js',
                    'desktop-b.js'
                ]);

                expect(writerTracker.getCodeForFilename('a.js')).to.equal('a=true;');
                expect(writerTracker.getCodeForFilename('c.js')).to.equal('c=true;');
                expect(writerTracker.getCodeForFilename('desktop-a.js')).to.equal('desktop_a');
                expect(writerTracker.getCodeForFilename('desktop-b.js')).to.equal('desktop_b');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for optimizing a page with flags', function(done) {
        var lasso = require('../');
        var myLasso = lasso.create({
            outputDir: outputDir,
            urlPrefix: '/',
            fingerprintsEnabled: false,
            flags: ['mobile'],
            bundlingEnabled: false
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(myLasso.writer);
        myLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './browser.json'
                ],
                from: nodePath.join(__dirname, 'test-flags-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    // a.js only included if "a" flag is enabled
                    //'a.js',

                    /* NOTE: b.js should not be included because it requires flag "b" */
                    // 'a.js'

                    // c.js is always included (not conditional)
                    'c.js',
                    'mobile-a.js',
                    'mobile-b.js'
                ]);

                expect(writerTracker.getCodeForFilename('c.js')).to.equal('c=true;');
                expect(writerTracker.getCodeForFilename('mobile-a.js')).to.equal('mobile_a');
                expect(writerTracker.getCodeForFilename('mobile-b.js')).to.equal('mobile_b');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for optimizing a page with flags and bundles', function(done) {
        var lasso = require('../');

        var from = nodePath.join(__dirname, 'test-flags-project');
        var myLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['a'],
            bundlingEnabled: true,

            bundles: [
                {
                    name: 'foo',
                    dependencies: [
                        './browser.json'
                    ]
                }
            ]
        }, from, __filename);
        var writerTracker = require('./WriterTracker').create(myLasso.writer);
        myLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    './c.js'
                ],
                from: from
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'foo.js'
                ]);

                expect(writerTracker.getCodeForFilename('foo.js')).to.equal('a=true;\nc=true;');
                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow if-not-flag', function(done) {
        var lasso = require('../');
        var myLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            flags: ['a'],
            bundlingEnabled: false
        }, __dirname, __filename);
        var writerTracker = require('./WriterTracker').create(myLasso.writer);
        myLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                    {'type': 'js', 'path': './a.js', 'if-flag': 'a'},
                    {'type': 'js', 'path': './b.js', 'if-not-flag': 'a'}
                ],
                from: nodePath.join(__dirname, 'test-flags-project')
            })
            .then(function(lassoPageResult) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    // a.js only included if "a" flag is enabled
                    'a.js',

                    /* NOTE: b.js should not be included because it will only be included if "a" flag is not enabled */
                    // 'b.js'
                ]);

                expect(writerTracker.getCodeForFilename('a.js')).to.equal('a=true;');
                expect(writerTracker.getCodeForFilename('b.js')).to.equal(undefined);
                lasso.flushAllCaches(done);
            })
            .done();
    });
});
