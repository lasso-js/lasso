require('raptor-polyfill/string/startsWith');

var logger = require('raptor-logging').logger(module);
var EventEmitter = require('events').EventEmitter;
var extend = require('raptor-util').extend;
var createError = require('raptor-util/createError');
var reader = require('../reader');
var ok = require('assert').ok;
var equal = require('assert').equal;
var series = require('raptor-async/series');

function Writer(impl) {
    Writer.$super.call(this);
    this.impl = impl || {};
}

Writer.prototype = {
    __LassoWriter: true,

    setLasso: function(lasso) {
        this.lasso = lasso;
    },

    getLasso: function() {
        return this.lasso;
    },

    getInPlaceUrlForFile: function(path, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        if (typeof path !== 'string') {
            throw new Error('Path for in-place file should be a string. Actual: ' + path);
        }

        var config = lassoContext.config;

        if (typeof config.getInPlaceUrlPrefix() === 'string') {
            var projectRoot = config.getProjectRoot();
            if (projectRoot && path.startsWith(projectRoot + '/')) {
                var suffix = path.substring(projectRoot.length);
                return config.getInPlaceUrlPrefix() + suffix;
            }
        }

        return null;
    },

    getInPlaceUrlForBundle: function(bundle, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        var dependency = bundle.dependency;
        if (!dependency) {
            throw new Error('"dependency" expected for in-place bundle');
        }

        if (!dependency.getSourceFile) {
            throw new Error('"getSourceFile" expected for in-place dependency');
        }

        if (!bundle.inPlaceDeployment) {
            throw new Error('inPlaceDeployment should be true');
        }

        var sourceFile = dependency.getSourceFile();
        return this.getInPlaceUrlForFile(sourceFile, lassoContext);
    },

    writeBundle: function(bundle, onBundleWrittenCallback, lassoContext, callback) {
        ok(callback, 'callback is required');

        if (!bundle.hasContent()) {
            return callback();
        }

        ok(lassoContext, 'lassoContext is required');
        var _this = this;

        function done(err) {
            if (err) {
                err = createError('Error while writing bundle "' + bundle + '" Error: ' + err, err);
                return callback(err);
            }

            bundle.setWritten(true);

            if (onBundleWrittenCallback) {
                onBundleWrittenCallback(bundle);
            }

            _this.emit('bundleWritten', {
                bundle: bundle
            });

            logger.info('Bundle ' + bundle + ' written.');

            return callback(null, bundle);
        }

        if (bundle.isWritten() || bundle.url) {
            if (logger.isInfoEnabled()) {
                logger.info('Bundle (' + bundle.getKey() + ') already written. Skipping writing...');
            }

            return done();
        } else if ((bundle.inPlaceDeployment === true) && !bundle.isInline()) {
            var inPlaceUrl = this.getInPlaceUrlForBundle(bundle, lassoContext);
            if (inPlaceUrl) {
                if (logger.isInfoEnabled()) {
                    logger.info('In-place deployment enabled for (' + bundle.getKey() + '). Skipping writing...');
                }
                bundle.setUrl(inPlaceUrl);
                return done();
            }
        }

        lassoContext = Object.create(lassoContext);
        lassoContext.bundle = bundle;
        lassoContext.dependencies = bundle.dependencies;

        var bundleReader = reader.createBundleReader(bundle, lassoContext);

        logger.info('Writing bundle ' + bundle + '...');

        var asyncTasks = [
            function checkBundleUpToDate(callback) {
                if (bundle.isInline()) {
                    return callback();
                }

                return _this.checkBundleUpToDate(bundle, lassoContext, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    // We make the assumption that the bundle was populated with its URL
                    // and marked as written if it was indeed up-to-date
                    return callback();
                });
            },

            function writeBundle(callback) {
                if (bundle.isWritten()) {
                    // If the bundle is written then there is nothing to do
                    return callback();
                }

                var completed = false;

                function handleError(e) {
                    if (!completed) {
                        completed = true;
                        return callback(e);
                    }
                }

                if (bundle.isInline()) {
                    bundleReader.readBundleFully(function(err, code) {
                        if (err) {
                            return handleError(err);
                        }

                        logger.info('Code for inline bundle ' + bundle.getLabel() + ' generated.');
                        bundle.setCode(code);
                        return callback();
                    });
                } else {
                    _this.impl.writeBundle(bundleReader, lassoContext, function(err) {
                        if (err) {
                            return handleError(err);
                        }

                        return callback();
                    });
                }
            }
        ];

        series(asyncTasks, done);
    },

    writeResource: function(path, lassoContext, callback) {
        ok(lassoContext, 'lassoContext is required');
        equal(typeof callback, 'function', 'callback function is required');

        var _this = this;

        function done(err, writeResult) {
            if (err) {
                return callback(createError('Error while writing resource "' + path + '": ' + (err.stack || err), err));
            }

            ok(writeResult, 'writeResult expected');
            ok(writeResult.url, 'writeResult.url expected');

            var result = extend(writeResult || {}, {
                sourceFile: path
            });

            _this.emit('resourceWritten', result);
            callback(null, result);
        }

        var config = this.config;


        if (config.isInPlaceDeploymentEnabled()) {
            var url = this.getInPlaceUrlForFile(path, lassoContext);
            if (url) {
                return done(null, { url: url });
            }
        }

        lassoContext = Object.create(lassoContext);
        lassoContext.path = path;

        var resourceReader = reader.createResourceReader(path, lassoContext);
        _this.impl.writeResource(resourceReader, lassoContext, done);
        // this.checkResourceUpToDate(path, lassoContext, function(err, resourceInfo) {
        //     if (err) {
        //         return callback(err);
        //     }
        //
        //     if (resourceInfo) {
        //         return callback(null, resourceInfo);
        //     }
        //
        //
        // });
    },

    checkBundleUpToDate: function(bundle, lassoContext, callback) {
        ok(lassoContext, 'lassoContext is required');
        equal(typeof callback, 'function', 'callback function is required');

        if (this.impl.checkBundleUpToDate) {
            this.impl.checkBundleUpToDate(bundle, lassoContext, function(err, resourceInfo) {
                if (err) {
                    return callback(err);
                }

                if (resourceInfo === false) {
                    resourceInfo = null;
                }

                return callback(null, resourceInfo);
            });
        } else {
            return callback();
        }
    },

    checkResourceUpToDate: function(path, lassoContext, callback) {
        ok(lassoContext, 'lassoContext is required');
        equal(typeof callback, 'function', 'callback function is required');

        if (this.impl.checkResourceUpToDate) {
            this.impl.checkResourceUpToDate(path, lassoContext, function(err, resourceInfo) {
                if (err) {
                    return callback(err);
                }

                if (resourceInfo === false) {
                    resourceInfo = null;
                }

                return callback(null, resourceInfo);
            });
        } else {
            return callback();
        }
    },

    writeBundles: function(iteratorFunc, onBundleWrittenCallback, lassoContext, callback) {
        ok(lassoContext, 'lassoContext is required');
        ok(callback, 'callback is required');

        var _this = this;

        var work = [];

        iteratorFunc(function(bundle) {
            if (bundle.hasContent()) {
                work.push(function(callback) {
                    _this.writeBundle(bundle, onBundleWrittenCallback, lassoContext, callback);
                });
            }
        });

        series(work, callback);
    }
};

require('raptor-util').inherit(Writer, EventEmitter);

module.exports = Writer;
