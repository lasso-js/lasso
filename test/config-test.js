'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var util = require('./util');
var outputDir = nodePath.join(__dirname, 'build');

require('app-module-path').addPath(nodePath.join(__dirname, 'src'));

describe('lasso-require' , function() {

    beforeEach(function(done) {

        util.rmdirRecursive(outputDir);

        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }

        require('raptor-promises').enableLongStacks();

        require('raptor-logging').configureLoggers({
            // 'raptor-cache': 'WARN',
            // 'lasso/lib/page-bundles-builder': 'WARN',
            // 'lasso/perf': 'WARN'
            'raptor-cache': 'WARN',
            'lasso': 'WARN',
            'lasso-debug': 'WARN'
        });

        done();
    });

    it('should not pollute default configuration (issue #91)', function() {
        var lasso = require('../');

        var myLasso1 = lasso.create({
            require: {
                test: 'abc'
            }
        }, nodePath.join(__dirname, 'test-project'));

        var myLasso2 = lasso.create({

        }, nodePath.join(__dirname, 'test-project'));

        var requirePlugin1 = myLasso1.getConfig().getPlugins()[0];
        var requirePlugin2 = myLasso2.getConfig().getPlugins()[0];

        expect(requirePlugin1.config.test).to.equal('abc');
        expect(requirePlugin2.config.test).to.not.exist;
    });
});
