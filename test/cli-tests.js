'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var path = require('path');

require('app-module-path').addPath(path.join(__dirname, 'src'));

describe('raptor-optimizer' , function() {

    beforeEach(function(done) {
        done();
    });

    it('should allow for require.resolve', function() {
        var parser = require('../lib/cli/parse-args')
            .createParser({
                dependencies: {
                    type: 'string',
                    array: true,
                    default: true
                },
                transform: {
                    type: 'string',
                    group: true,
                    array: true
                },
                plugin: {
                    type: 'string',
                    group: true,
                    array: true
                }
            })
            .on('arg', function('require-run:main.js style.css --plugin raptor-optimizer-require'.split(/\s/)) {

            })
            .parse()

        var args = parseArgs('require-run:main.js style.css --plugin raptor-optimizer-require'.split(/\s/), {

            dependencies: {
                type: 'string',
                array: true,
                default: true
            },
            transform: {
                type: 'string',
                group: true,
                array: true
            },
            plugin: {
                type: 'string',
                group: true,
                array: true
            }
        });

        expect(args._).length.to.equal(2);
    });
});

