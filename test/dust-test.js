'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');

function testRender(path, data, done, options) {
    var inputPath = nodePath.join(__dirname, path);
    var expectedPath = nodePath.join(__dirname, path + '.expected.html');
    var actualPath = nodePath.join(__dirname, path + '.actual.html');
    options = options || {};
    // var compiledPath = nodePath.join(__dirname, path + '.actual.js');
    // var compiler = require('marko/compiler').createCompiler(inputPath);
    // var src = fs.readFileSync(inputPath, {encoding: 'utf8'});

    // var compiledSrc = compiler.compile(src);
    // fs.writeFileSync(compiledPath, compiledSrc, {encoding: 'utf8'});


    var dust = require('dustjs-linkedin');

    inputPath = inputPath.replace(/[\\]/g, '/');

    dust.render(inputPath, data, function(err, output) {
        if (err) {
            return done(err);
        }

        try {
            fs.writeFileSync(actualPath, output, {encoding: 'utf8'});

            var expected;
            try {
                expected = options.expected || fs.readFileSync(expectedPath, {encoding: 'utf8'});
            }
            catch(e) {
                expected = 'TBD';
                fs.writeFileSync(expectedPath, expected, {encoding: 'utf8'});
            }

            if (output !== expected) {
                throw new Error('Unexpected output for "' + inputPath + '":\nEXPECTED (' + expectedPath + '):\n---------\n' + expected +
                    '\n---------\nACTUAL (' + actualPath + '):\n---------\n' + output + '\n---------');
            }
            done();
        } catch(e) {
            return done(e);
        }
    });
}

require('raptor-logging').configureLoggers({
        'lasso': 'WARN'
    });



describe('lasso/dust' , function() {

    beforeEach(function(done) {
        var dust = require('dustjs-linkedin');
        dust.onLoad = function(path, callback) {
            if (!fs.existsSync(path)) {
                if (!path.endsWith('.dust')) {
                    path += '.dust';
                }
            }

            fs.readFile(path, 'utf-8', callback);
        };


        require('../dust').registerHelpers(dust);

        require('../').configure({
            fileWriter: {
                outputDir: nodePath.join(__dirname, 'build'),
                urlPrefix: '/static',
                includeSlotNames: false,
                fingerprintsEnabled: false
            },
            flags: ['browser']
        }, __dirname);

        done();
    });

    // it('should compile a simple page template', function() {
    //     testCompiler('test-project/src/pages/page1.marko');
    // });

    it('should render a simple page template for Dust', function(done) {
        require('../').configure({
            fileWriter: {
                outputDir: nodePath.join(__dirname, 'build'),
                urlPrefix: '/static',
                includeSlotNames: false,
                fingerprintsEnabled: false
            },
            flags: ['browser']
        }, __dirname);

        testRender('test-project/src/pages/page1/template.dust', {
            packagePath: nodePath.join(__dirname, 'test-project/src/pages/page1/browser.json')
        }, done);
    });

});

