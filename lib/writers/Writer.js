var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var eventStream = require('event-stream');
var nodePath = require('path');
var raptorFiles = require('raptor-files');
var extend = require('raptor-util').extend;
var domain = require('domain');
var resolved = promises.resolved();
var reader = require('../reader');
var fs = require('fs');
var ok = require('assert').ok;

require('raptor-promises').enableLongStacks();

function Writer() {
    Writer.$super.call(this);
    this.context = null;
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
        context = context || this.context;

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

    getInPlaceUrlForBundle: function(bundle) {
        var context = this.context;

        if (!context) {
            throw new Error("context is required");
        }

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

    writeBundle: function(bundle, onBundleWrittenCallback) {
        var _this = this;

        // if (!checksumsEnabled) {
        //     outputFile = new File(outputDir, urlBuilder.getBundleFilename(bundle, this.context));
        //     bundle.outputFile = outputFile.getAbsolutePath();
        //     bundle.urlBuilder = urlBuilder;

        //     if (bundle.sourceDependency && outputFile.exists() && bundle.sourceDependency.hasModifiedChecksum()) {
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
        } else if (bundle.isWritten()) {
            logger.info("Bundle (" + bundle.getKey() + ") already written. Skipping writing...");
            return resolved.then(onBundleFinished);
        } else if (bundle.inPlaceDeployment === true) {

            var inPlaceUrl = this.getInPlaceUrlForBundle(bundle);
            if (inPlaceUrl) {
                logger.info("In-place deployment enabled for (" + bundle.getKey() + "). Skipping writing...");
                bundle.setUrl(inPlaceUrl);
                return resolved.then(onBundleFinished);
            }
        }

        var context = this.context;

        return resolved
            .then(function() {
                if (!bundle.isInline() && _this.checkBundleUpToDate) {
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
                    logger.error('Error while writing bundle "' + bundle + '". Error: ' + (e.stack || e), e);
                    deferred.reject(e);
                };

                var input = reader.readBundle(bundle, context);
                if (bundle.isInline()) {
                    var code = '';
                    var dest = eventStream.through(function write(data) {
                            code += data;
                        },
                        function end() {
                            try {
                                logger.info('Code for inline bundle ' + bundle.getLabel() + ' generated.');
                                bundle.setCode(code);
                                deferred.resolve(onBundleFinished());
                            }
                            catch(e) {
                                handleError(e);
                            }

                        });

                    input.on('error', handleError);
                    dest.on('error', handleError);

                    input.pipe(dest);
                }
                else {
                    _this.doWriteBundle(input, bundle)
                        .then(onBundleFinished)
                        .then(function() {
                            deferred.resolve(bundle);
                        })
                        .fail(function(e) {
                            deferred.reject(e);
                        });
                }

                return deferred.promise;
            });
    },

    writeBundles: function(iteratorFunc, onBundleWrittenCallback) {
        var _this = this;

        var promiseArray = [];

        iteratorFunc(function(bundle) {
            promiseArray.push(_this.writeBundle(bundle, onBundleWrittenCallback));
        });

        return promises.all(promiseArray);
    },

    writeResource: function(path, context) {
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

        return resolved
            .then(function() {
                if (_this.checkResourceUpToDate) {
                    return _this.checkResourceUpToDate(path, context);
                }
                else {
                    // Assume the resource is not up-to-date
                    return null;
                }
            })
            .then(function(resourceInfo) {
                if (resourceInfo) {
                    return resourceInfo;
                }

                var deferred = promises.defer();

                var d = domain.create();

                var handleError = function(e) {
                    logger.error('Error while writing resource "' + path + '"', e);
                    deferred.reject(e);
                };

                d.on('error', handleError);

                d.run(function() {
                    var input = fs.createReadStream(path);
                    _this.doWriteResource(input, path, context)
                        .then(onResourceWritten)
                        .then(function(result) {
                            deferred.resolve(result);
                        })
                        .fail(function(e) {
                            deferred.reject(e);
                        });
                });

                return deferred.promise;
            });
    },

    setContext: function(context) {
        this.context = context;
    },

    getContext: function() {
        return this.context;
    }
};

require('raptor-util').inherit(Writer, EventEmitter);

module.exports = Writer;
