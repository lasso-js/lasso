var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var listeners = require('raptor-listeners');
var eventStream = require('event-stream');
var nodePath = require('path');
var raptorFiles = require('raptor-files');
var extend = require('raptor-util').extend;
var domain = require('domain');
var resolved = promises.resolved();
var reader = require('../reader');
var fs = require('fs');
var ok = require('assert').ok;

function Writer() {
    listeners.makeObservable(this, Writer.prototype, ['bundleWritten', 'resourceWritten']);
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

        if (config.getInPlaceUrlPrefix()) {
            var projectRoot = config.getProjectRoot();
            if (projectRoot && path.startsWith(projectRoot)) {
                var suffix = path.substring(projectRoot.length);
                return config.getInPlaceUrlPrefix() + suffix;
            }
        }

        var basePath = context.basePath;
        if (basePath) {
            // Generate an in-place URL using a base route (e.g. "/src/ui-components/buttons/SimpleButton/style.css");
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
            if (!bundle.getUrl()) {
                throw new Error('bundle.getUrl() returned empty value');
            }
            bundle.setWritten(true);

            if (onBundleWrittenCallback) {
                onBundleWrittenCallback(bundle);
            }

            _this.publish('bundleWritten', {
                bundle: bundle
            });

            return bundle;
        }

        if (bundle.writePromise) {
            return bundle.writePromise.then(onBundleFinished);
        }
        else if (bundle.isWritten()) {
            logger.info("Bundle (" + bundle.getKey() + ") already written. Skipping writing...");
            return resolved.then(onBundleFinished);
        }
        else if (bundle.getUrl()) {
            return resolved.then(onBundleFinished);
        }
        else if (bundle.inPlaceDeployment === true) {
            logger.info("In-place deployment enabled for (" + bundle.getKey() + "). Skipping writing...");
            bundle.setUrl(this.getInPlaceUrlForBundle(bundle));
            return resolved.then(onBundleFinished);
        }
        else {
            var deferred = promises.defer();
            var context = this.context;

            var d = domain.create(); 

            var handleError = function(e) {
                logger.error('Error while writing bunde "' + bundle + '"', e);
                deferred.reject(e);
            };

            d.on('error', handleError);

            d.run(function() { 
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
            }); 

            return deferred.promise;
        }


        // pageOptimizer.readBundle(bundle, this.context).pipe(this.getWritableStream());

        // return pageOptimizer.readBundle(bundle, this.context)
        //         .then(function(bundleInfo) {
        //             var code = bundleInfo.code;
        //             var checksum = bundleInfo.checksum;
        //             bundle.setChecksum(checksum);

        //             if (!outputFile) {
        //                 // Now that we have update the bundle with a checksum, we can
        //                 outputFile = new File(outputDir, urlBuilder.getBundleFilename(bundle));
        //             }


        //             bundle.outputFile = outputFile.getAbsolutePath();
        //             bundle.urlBuilder = urlBuilder;

        //             logger.info('Writing bundle file to "' + outputFile.getAbsolutePath() + '"...');
        //             _this.writeBundleFile(outputFile, code, bundle);
        //             deferred.resolve();
        //         });
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

        function onResourceWritten(writeResult) {
            ok(writeResult, 'writeResult expected');
            ok(writeResult.url, 'writeResult.url expected');

            var result = extend(writeResult || {}, {
                sourceFile: path
            });

            _this.publish('resourceWritten', result);
            return result;
        }

        var config = this.config;

        if (config.isInPlaceDeploymentEnabled()) {
            var url = this.getInPlaceUrlForFile(path, context);
            return promises.makePromise({ url: url }).then(onResourceWritten);
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
    },

    setContext: function(context) {
        this.context = context;
    },

    getContext: function() {
        return this.context;
    }
};


module.exports = Writer;