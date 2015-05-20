'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var util = require('./util');
var outputDir = nodePath.join(__dirname, 'build');
var fs = require('fs');

describe('lasso/util', function() {

    beforeEach(function(done) {
        util.rmdirRecursive(outputDir);
        require('raptor-promises').enableLongStacks();
        require('raptor-logging').configureLoggers({
            'lasso': 'WARN',
            'raptor-cache': 'WARN'
        });
        done();
    });

    it('should support caching and replaying streams', function(done) {
        var util = require('../lib/util');

        var cachingStream = util.createCachingStream();

        fs.mkdirSync(nodePath.join(__dirname, 'build'));

        var inFile = nodePath.join(__dirname, 'fixtures/hello.txt');
        var outFile1 = nodePath.join(__dirname, 'build/hello-1.txt');
        var outFile2 = nodePath.join(__dirname, 'build/hello-2.txt');

        var readStream = fs.createReadStream(inFile);
        var outStream = fs.createWriteStream(outFile1);

        outStream.on('close', function() {

            outStream = fs.createWriteStream(outFile2);
            outStream.on('close', function() {
                var inTxt = fs.readFileSync(inFile, {encoding: 'utf8'});
                var outFile1Txt = fs.readFileSync(outFile1, {encoding: 'utf8'});
                var outFile2Txt = fs.readFileSync(outFile2, {encoding: 'utf8'});
                expect(inTxt).to.equal(outFile1Txt);
                expect(inTxt).to.equal(outFile2Txt);
                done();
            });

            cachingStream.createReplayStream().pipe(outStream);
        });

        readStream.pipe(cachingStream).pipe(outStream);
    });

});
