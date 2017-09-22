'use strict';
const chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
const expect = require('chai').expect;
const nodePath = require('path');
const fs = require('fs');

const lassoImagePlugin = require('../lib/plugins/lasso-image'); // Load this module just to make sure it works
const lasso = require('../');

describe('lasso-image', function () {

    it('should allow for reading image info on the server', function(done) {
        const imgPath = require.resolve('./fixtures/ebay.png');

        lassoImagePlugin.getImageInfo(imgPath, function (err, imageInfo) {
            if (err) return done(err);
            expect(imageInfo).to.deep.equal({
                url: '/static/ebay-73498128.png',
                width: 174,
                height: 30
            });
            done();
        });
    });

    it('should compile an image into a JavaScript module', async function() {
        var myLasso = lasso.create({
            fileWriter: {
                fingerprintsEnabled: false,
                outputDir: nodePath.join(__dirname, 'static')
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: lassoImagePlugin,
                    config: {

                    }
                },
                {
                    plugin: 'lasso-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        });

        await myLasso.lassoPage({
            name: 'testPage',
            dependencies: [
                'require: ./fixtures/ebay.png'
            ],
            from: module
        });

        var output = fs.readFileSync(nodePath.join(__dirname, '/static/testPage.js'), {encoding: 'utf8'});
        expect(output).to.contain('174');
        expect(output).to.contain('30');
        expect(output).to.contain('/static');
        expect(output).to.contain('ebay.png');
        return lasso.flushAllCaches();
    });

    it('should compile an image into a JavaScript module when not using require', async function() {
        var myLasso = lasso.create({
            fileWriter: {
                fingerprintsEnabled: false,
                outputDir: nodePath.join(__dirname, 'static')
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: lassoImagePlugin,
                    config: {

                    }
                },
                {
                    plugin: 'lasso-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        });

        await myLasso.lassoPage({
            name: 'testPage2',
            dependencies: [
                './fixtures/ebay.png'
            ],
            from: module
        });

        var output = fs.readFileSync(nodePath.join(__dirname, '/static/testPage.js'), {encoding: 'utf8'});
        expect(output).to.contain('174');
        expect(output).to.contain('30');
        expect(output).to.contain('/static');
        expect(output).to.contain('ebay.png');
        return lasso.flushAllCaches();
    });

    it('should allow passing the renderContext', function(done) {
        class Writer {
            async writeResource (reader, lassoContext) {
                var requestContext = lassoContext.data.renderContext.stream;
                var protocol = requestContext.secure ? 'https:' : 'http:';

                return {
                    url: protocol + '//static.example.com/ebay.png'
                };
            }
        }

        var myLasso = lasso.create();
        myLasso.writer = new Writer();
        myLasso.on('buildCacheKey', function(eventArgs) {
            var lassoContext = eventArgs.context;
            var requestContext = lassoContext.data.renderContext.stream;

            var cacheKey = eventArgs.cacheKey;

            if (requestContext.secure) {
                cacheKey.add('secure');
            }
        });

        var mockRenderContext = {
            stream: {
                secure: true
            }
        };

        lassoImagePlugin.getImageInfo(require.resolve('./fixtures/ebay.png'), {
            lasso: myLasso,
            renderContext: mockRenderContext
        }, function (err, imageInfo) {
            if (err) return done(err);
            expect(imageInfo).to.deep.equal({
                url: 'https://static.example.com/ebay.png',
                width: 174,
                height: 30
            });
            done();
        });
    });
});
