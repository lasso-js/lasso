var logger = require('raptor-logging').logger(module);
var EventEmitter = require('events').EventEmitter;
var nodePath = require('path');
var raptorFiles = require('raptor-files');
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
    __OptimizerWriter: true,

    getConfig: function() {
        return this.config;
    },

    setConfig: function(config) {
        this.config = config;
    },

    setPageOptimizer: function(pageOptimizer) {
        this.pageOptimizer = pageOptimizer;
    },

    getPageOptimizer: function() {
        return this.pageOptimizer;
    },

    getInPlaceUrlForFile: function(path, context) {
        ok(context, 'context is required');

        if (typeof path !== 'string') {
            throw new Error('Path for in-place file should be a string. Actual: ' + path);
        }

        var config = this.getConfig();

        if (typeof config.getInPlaceUrlPrefix() === 'string') {
            var projectRoot = config.getProjectRoot();

            if (projectRoot && path.startsWith(projectRoot)) {
                var suffix = path.substring(projectRoot.length);
                return config.getInPlaceUrlPrefix() + suffix;
            }

            return null;
        }

        var basePath = context.basePath;
        if (basePath) {
            // Generate an in-place URL using a base route (e.g. "/src/ui-components/button");
            return nodePath.relative(basePath, path);
        }
        else {
            // Use file://
            return raptorFiles.fileUrl(path);
        }
    },

    getInPlaceUrlForBundle: function(bundle, context) {
        ok(context, 'context is required');

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
        return this.getInPlaceUrlForFile(sourceFile, context);
    },

    writeBundle: function(bundle, onBundleWrittenCallback, context, callback) {
        ok(callback, 'callback is required');

        if (!bundle.hasContent()) {
            return callback();
        }

        ok(context, 'context is required');
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
            var inPlaceUrl = this.getInPlaceUrlForBundle(bundle, context);
            if (inPlaceUrl) {
                if (logger.isInfoEnabled()) {
                    logger.info('In-place deployment enabled for (' + bundle.getKey() + '). Skipping writing...');
                }
                bundle.setUrl(inPlaceUrl);
                return done();
            }
        }

        context = Object.create(context);
        context.bundle = bundle;
        context.dependencies = bundle.dependencies;

        var bundleReader = reader.createBundleReader(bundle, context);

        logger.info('Writing bundle ' + bundle + '...');

        var asyncTasks = [
            function(callback) {
                if (bundle.isInline()) {
                    return callback();
                }

                return _this.checkBundleUpToDate(bundle, context, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    // We make the assumption that the bundle was populated with its URL
                    // and marked as written if it was indeed up-to-date
                    return callback();
                });
            },

            function(callback) {
                if (bundle.isWritten()) {
                    // If the bundle is written then there is nothing to do
                    return callback();
                }

                function handleError(e) {

                    return callback(e);
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
                    _this.impl.writeBundle(bundleReader, context, function(err) {
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

    writeResource: function(path, context, callback) {
        ok(context, 'context is required');
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
            var url = this.getInPlaceUrlForFile(path, context);
            if (url) {
                return done(null, { url: url });
            }
        }

        context = Object.create(context);
        context.path = path;

        var resourceReader = reader.createResourceReader(path, context);
        _this.impl.writeResource(resourceReader, context, done);
        // this.checkResourceUpToDate(path, context, function(err, resourceInfo) {
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

    checkBundleUpToDate: function(bundle, context, callback) {
        ok(context, 'context is required');
        equal(typeof callback, 'function', 'callback function is required');

        if (this.impl.checkBundleUpToDate) {
            this.impl.checkBundleUpToDate(bundle, context, function(err, resourceInfo) {
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

    checkResourceUpToDate: function(path, context, callback) {
        ok(context, 'context is required');
        equal(typeof callback, 'function', 'callback function is required');

        if (this.impl.checkResourceUpToDate) {
            this.impl.checkResourceUpToDate(path, context, function(err, resourceInfo) {
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

    writeBundles: function(iteratorFunc, onBundleWrittenCallback, optimizerContext, callback) {
        ok(optimizerContext, 'optimizerContext is required');
        ok(callback, 'callback is required');

        var _this = this;

        var work = [];

        iteratorFunc(function(bundle) {
            if (bundle.hasContent()) {
                work.push(function(callback) {
                    _this.writeBundle(bundle, onBundleWrittenCallback, optimizerContext, callback);
                });
            }
        });

        series(work, callback);
    }
};

require('raptor-util').inherit(Writer, EventEmitter);

module.exports = Writer;
