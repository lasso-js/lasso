var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var nodePath = require('path');
var raptorFiles = require('raptor-files');
var extend = require('raptor-util').extend;
var createError = require('raptor-util/createError');
var resolved = promises.resolved();
var reader = require('../reader');
var ok = require('assert').ok;

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

    writeBundle: function(bundle, onBundleWrittenCallback, context) {
        if (!bundle.hasContent()) {
            return resolved;
        }
        
        ok(context, 'context is required');
        var _this = this;

        // if (!fingerprintsEnabled) {
        //     outputFile = new File(outputDir, urlBuilder.getBundleFilename(bundle, this.context));
        //     bundle.outputFile = outputFile.getAbsolutePath();
        //     bundle.urlBuilder = urlBuilder;

        //     if (bundle.sourceDependency && outputFile.exists() && bundle.sourceDependency.hasModifiedFingerprint()) {
        //         logger.info('Bundle "' + outputFile.getAbsolutePath() + '" written to disk is up-to-date. Skipping...');
        //         return require('raptor-promises').resolved();
        //     }
        //     else if (bundle.sourceResource && outputFile.exists() && outputFile.lastModified() > bundle.sourceResource.lastModified()) {
        //         logger.info('Bundle "' + outputFile.getAbsolutePath() + '" written to disk is up-to-date. Skipping...');
        //         return require('raptor-promises').resolved();
        //     }
        // }

        function onBundleFinished() {
            bundle.setWritten(true);

            if (onBundleWrittenCallback) {
                onBundleWrittenCallback(bundle);
            }

            _this.emit('bundleWritten', {
                bundle: bundle
            });

            return bundle;
        }

        if (bundle.writePromise) {
            return bundle.writePromise.then(onBundleFinished);
        } else if (bundle.isWritten() || bundle.url) {
            if (logger.isInfoEnabled()) {
                logger.info('Bundle (' + bundle.getKey() + ') already written. Skipping writing...');
            }
            return resolved.then(onBundleFinished);
        } else if (bundle.inPlaceDeployment === true) {

            var inPlaceUrl = this.getInPlaceUrlForBundle(bundle, context);
            if (inPlaceUrl) {
                if (logger.isInfoEnabled()) {
                    logger.info('In-place deployment enabled for (' + bundle.getKey() + '). Skipping writing...');
                }
                bundle.setUrl(inPlaceUrl);
                return resolved.then(onBundleFinished);
            }
        }

        context = Object.create(context);
        context.bundle = bundle;
        context.dependencies = bundle.dependencies;

        var bundleReader = reader.createBundleReader(bundle, context);

        return resolved
            .then(function() {
                if (!bundle.isInline()) {
                    return _this.checkBundleUpToDate(bundle, context);
                }
            })
            .then(function() {
                if (bundle.isWritten()) {
                    // If the bundle is written then there is nothing to do
                    return onBundleFinished();
                }

                var deferred = promises.defer();

                var handleError = function(e) {
                    e = createError('Error while writing bundle "' + bundle + '" Error: ' + e, e);
                    deferred.reject(e);
                };

                if (bundle.isInline()) {
                    bundleReader.readBundleFully(function(err, code) {
                        if (err) {
                            return handleError(err);
                        }

                        try {
                            logger.info('Code for inline bundle ' + bundle.getLabel() + ' generated.');
                            bundle.setCode(code);
                            deferred.resolve(onBundleFinished());
                        }
                        catch(e) {
                            handleError(e);
                        }
                    });
                } else {
                    _this.impl.writeBundle(bundleReader, context, function(err) {
                        if (err) {
                            return handleError(err);
                        }

                        onBundleFinished();

                        deferred.resolve(bundle);
                    });
                }

                return deferred.promise;
            });
    },

    writeResource: function(path, context) {
        ok(context, 'context is required');

        var _this = this;

        function onResourceWritten(writeResult) {
            ok(writeResult, 'writeResult expected');
            ok(writeResult.url, 'writeResult.url expected');

            var result = extend(writeResult || {}, {
                sourceFile: path
            });

            _this.emit('resourceWritten', result);
            return result;
        }

        var config = this.config;


        if (config.isInPlaceDeploymentEnabled()) {
            var url = this.getInPlaceUrlForFile(path, context);
            if (url) {
                return promises.resolved({ url: url }).then(onResourceWritten);
            }
        }

        context = Object.create(context);
        context.path = path;

        return resolved
            .then(function() {
                return _this.checkResourceUpToDate(path, context);
            })
            .then(function(resourceInfo) {
                if (resourceInfo) {
                    return resourceInfo;
                }

                var resourceReader = reader.createResourceReader(path, context);

                var deferred = promises.defer();

                var handleError = function(e) {
                    logger.error('Error while writing resource "' + path + '"', e);
                    deferred.reject(e);
                };

                _this.impl.writeResource(resourceReader, context, function(err, writeResult) {
                    if (err) {
                        return handleError(err);
                    }

                    ok(writeResult, 'Invalid args passed to callback for writeResource');

                    onResourceWritten(writeResult);
                    deferred.resolve(writeResult);
                });

                return deferred.promise;
            });
    },

    checkBundleUpToDate: function(bundle, context) {
        ok(context, 'context is required');

        var deferred = promises.defer();

        if (this.impl.checkBundleUpToDate) {
            this.impl.checkBundleUpToDate(bundle, context, function(err, resourceInfo) {
                if (err) {
                    return deferred.reject(err);
                }

                if (resourceInfo === false) {
                    resourceInfo = null;
                }

                deferred.resolve(resourceInfo);
            });
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    },

    checkResourceUpToDate: function(path, context) {
        ok(context, 'context is required');

        var deferred = promises.defer();

        if (this.impl.checkResourceUpToDate) {
            this.impl.checkResourceUpToDate(path, context, function(err, resourceInfo) {
                if (err) {
                    return deferred.reject(err);
                }

                if (resourceInfo === false) {
                    resourceInfo = null;
                }

                deferred.resolve(resourceInfo);
            });
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    },

    writeBundles: function(iteratorFunc, onBundleWrittenCallback, context) {
        ok(context, 'context is required');

        var _this = this;

        var promiseArray = [];

        iteratorFunc(function(bundle) {
            if (bundle.hasContent()) {
                promiseArray.push(_this.writeBundle(bundle, onBundleWrittenCallback, context));
            }
        });

        return promises.all(promiseArray);
    }
};

require('raptor-util').inherit(Writer, EventEmitter);

module.exports = Writer;
