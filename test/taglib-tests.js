'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');

var StringBuilder = require('raptor-strings/StringBuilder');

function testRender(path, data, done, options) {
    var inputPath = nodePath.join(__dirname, path);
    var expectedPath = nodePath.join(__dirname, path + '.expected.html');
    var actualPath = nodePath.join(__dirname, path + '.actual.html');
    options = options || {};
    // var compiledPath = nodePath.join(__dirname, path + '.actual.js');
    // var compiler = require('raptor-templates/compiler').createCompiler(inputPath);
    // var src = fs.readFileSync(inputPath, {encoding: 'utf8'});
    
    // var compiledSrc = compiler.compile(src);
    // fs.writeFileSync(compiledPath, compiledSrc, {encoding: 'utf8'});

    var raptorTemplates = require('raptor-templates');
    var Context = raptorTemplates.Context;
    var context = options.context || new Context(new StringBuilder());

    raptorTemplates.render(inputPath, data, context)
        .on('end', function() {
            try {
                var output = context.getOutput();

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
        })
        .on('error', function(e) {
            done(e || new Error('Error during render'));
        });

    context.end();
        
}

require('raptor-logging').configureLoggers({
        'raptor-optimizer': 'WARN'
    });


describe('raptor-optimizer/taglib' , function() {

    beforeEach(function(done) {
        
        done();
    });

    // it('should compile a simple page template', function() {
    //     testCompiler('test-project/src/pages/page1.rhtml');
    // });

    it('should render a simple page template', function(done) {
        require('../').configure({
            fileWriter: {
                outputDir: nodePath.join(__dirname, 'build'),
                urlPrefix: '/static',
                includeSlotNames: false,
                checksumsEnabled: false
            },
            enabledExtensions: ['browser']
        }, __dirname);


        testRender('test-project/src/pages/page1/template.rhtml', {}, done);
    });

});

