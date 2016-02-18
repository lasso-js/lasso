'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var path = require('path');
var outputDir = path.join(__dirname, 'build');

require('app-module-path').addPath(path.join(__dirname, 'src'));



describe('lasso/es6', function() {
    this.timeout(15000); // Babel is really slow to load...

    require("babel-register")({
        extensions: [".es6"]
    });

    it('should allow for es6 module transpiling using babel', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            outputDir: outputDir,
            urlPrefix: '/',
            fingerprintsEnabled: false,
            bundlingEnabled: false
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                cache: false,
                dependencies: [
                    {
                        type: 'require',
                        path: path.join(__dirname, './fixtures/babel/test.es6')
                    }
                ]
            })
            .then(function(lassoPageResult) {
                var testCode = writerTracker.getCodeForFilename('test.es6.js');
                expect(testCode).to.contain('require("./foo")');

                var fooCode = writerTracker.getCodeForFilename('foo.es6.js');
                expect(fooCode).to.contain('123');

                lasso.flushAllCaches(done);
            })
            .done();
    });

    it('should allow for vanilla es6 transpiling using babel', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            outputDir: outputDir,
            urlPrefix: '/',
            fingerprintsEnabled: false,
            bundlingEnabled: false
        }, __dirname, __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                cache: false,
                dependencies: [
                    path.join(__dirname, './fixtures/babel/vanilla.es6')
                ]
            })
            .then(function(lassoPageResult) {
                var testCode = writerTracker.getCodeForFilename('vanilla.es6.js');
                expect(testCode).to.not.contain('let');
                expect(testCode).to.not.contain('require');

                lasso.flushAllCaches(done);
            })
            .done();
    });
});
