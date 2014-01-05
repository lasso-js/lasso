var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var listeners = require('raptor-listeners');
var extend = require('raptor-util').extend;

var FileUrlBuilder = require('./FileUrlBuilder');

var OptimizerWriterMixins = function() {
};

OptimizerWriterMixins.addMixins = function(writer) {
    var targetProto = writer.constructor ? writer.constructor.prototype : writer;
    if (targetProto === Object.prototype) {
        throw new Error('"constructor" property not set correctly for writer');
    }

    if (writer.__OptimizerWriterMixins !== true) {
        // Apply the mixins from OptimizerWriterMixins to the provided writer's prototype
        extend(targetProto, OptimizerWriterMixins.prototype);
    }
    listeners.makeObservable(writer, targetProto, ['bundleWritten']);
    OptimizerWriterMixins.call(writer);
};

OptimizerWriterMixins.prototype = {
    __OptimizerWriterMixins: true,

    configure: function(pageOptimizer) {
        var config = pageOptimizer.getConfig();
        this.pageOptimizer = pageOptimizer;
        this.config = config;
        this.outputDir = config.getOutputDir();
        this.urlPrefix = config.getUrlPrefix();
        this.inPlaceUrlBuilder = new FileUrlBuilder(config);
        this.setUrlBuilder(this.createUrlBuilder());
    },

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

    writeBundles: function(iteratorFunc, onBundleWrittenCallback) {

        var promisesArray = [];
        var _this = this;

        var deferred = promises.defer();
        var errorHandled = false;
        function onError(e) {
            if (errorHandled) {
                return;
            }
            errorHandled = true;

            deferred.reject(e);
        }

        function onBundleFinished(bundle) {
            if (onBundleWrittenCallback) {
                onBundleWrittenCallback(bundle);
            }

            _this.publish('bundleWritten', {
                bundle: bundle
            });
        }

        try {
            iteratorFunc(function(bundle) {

                if (bundle.isWritten()) {
                    logger.info("Bundle (" + bundle.getKey() + ") already written to disk. Skipping...");
                    onBundleFinished(bundle);
                    return;
                }

                logger.info('Writing bundle: "' + bundle.getKey() + '"...');

                if (bundle.inPlaceDeployment === true) {
                    bundle.setUrl(_this.inPlaceUrlBuilder.buildBundleUrl(bundle, _this.context));
                    onBundleFinished(bundle);
                    return;
                }

                if (bundle.getUrl(_this.context)) {
                    onBundleFinished(bundle);
                    return;
                }

                var startTime = Date.now();
                var promise = bundle.writePromise;
                if (!promise) { // Only write the bundle once
                    if (bundle.isInline()) {
                        // For inline bundles, we won't actually write the bundle, but we will
                        // read the code for the bundle (with filters applied) and then
                        // store the resulting code with the bundle itself
                        promise = _this.pageOptimizer.readBundle(bundle, _this.context)
                            .then(function(bundleInfo) {
                                bundle.setCode(bundleInfo.code); // Store the code with the bundle
                            });
                    }
                    else {
                        promise = _this.writeBundle(bundle);
                    }
                    
                    bundle.writePromise = promise;
                    promise.then(
                        function() {
                            bundle.setWritten(true);
                            if (bundle.isInline()) {
                                logger.info('Code for inline bundle ' + bundle.getLabel() + ' generated in ' + (Date.now() - startTime) + 'ms');
                            }
                            else {
                                logger.info('Bundle ' + bundle.getLabel() + ' written to disk in ' + (Date.now() - startTime) + 'ms');
                            }
                            
                            onBundleFinished(bundle);
                        })
                        .fail(onError)
                        .done();
                }

                promisesArray.push(promise);
            });
        }
        catch(e) {
            onError(e);
        }
        
        promises.all(promisesArray)
            .then(function() {
                deferred.resolve();
            })
            .fail(onError);

        return deferred.promise;
    },

    setContext: function(context) {
        this.context = context;
    },

    getContext: function() {
        return this.context;
    }
};


module.exports = OptimizerWriterMixins;