var File = require('raptor-files').File;
var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var FileUrlBuilder = require('./FileUrlBuilder');

var OptimizerFileWriter = function() {

};

OptimizerFileWriter.prototype = {

    createUrlBuilder: function() {
        return new FileUrlBuilder(this.config);
    },
    
    getBundleOutputDir: function(bundle) {
        return this.getOutputDir();
    },

    getOutputDir: function() {
        return this.config.getOutputDir();
    },
    
    writeBundle: function(bundle) {
        var deferred = promises.defer();
        

        var checksumsEnabled = bundle.checksumsEnabled;
        if (checksumsEnabled === undefined) {
            // checksumsEnabled not set for bundle so check optimizer config
            checksumsEnabled = (this.config.checksumsEnabled !== false) || bundle.requireChecksum;
        }

        checksumsEnabled = checksumsEnabled === true;

        var pageOptimizer = this.pageOptimizer;
        var urlBuilder = this.getUrlBuilder();
        var outputDir = this.getBundleOutputDir(bundle);
        var _this = this;
        var outputFile;

        if (!urlBuilder) {
            throw new Error("URL builder not set.");
        }

        if (!checksumsEnabled) {
            outputFile = new File(outputDir, urlBuilder.getBundleFilename(bundle, this.context));
            bundle.outputFile = outputFile.getAbsolutePath();
            bundle.urlBuilder = urlBuilder;

            if (bundle.sourceDependency && outputFile.exists() && bundle.sourceDependency.hasModifiedChecksum()) {
                logger.info('Bundle "' + outputFile.getAbsolutePath() + '" written to disk is up-to-date. Skipping...');
                return require('raptor-promises').resolved();
            }
            else if (bundle.sourceResource && outputFile.exists() && outputFile.lastModified() > bundle.sourceResource.lastModified()) {
                logger.info('Bundle "' + outputFile.getAbsolutePath() + '" written to disk is up-to-date. Skipping...');
                return require('raptor-promises').resolved();
            }
        }

        return pageOptimizer.readBundle(bundle, this.context)
                .then(function(bundleInfo) {
                    var code = bundleInfo.code;
                    var checksum = bundleInfo.checksum;
                    bundle.setChecksum(checksum);

                    if (!outputFile) {
                        // Now that we have update the bundle with a checksum, we can
                        outputFile = new File(outputDir, urlBuilder.getBundleFilename(bundle));
                    }


                    bundle.outputFile = outputFile.getAbsolutePath();
                    bundle.urlBuilder = urlBuilder;

                    logger.info('Writing bundle file to "' + outputFile.getAbsolutePath() + '"...');
                    _this.writeBundleFile(outputFile, code, bundle);
                    deferred.resolve();
                });
    },

    writeBundleFile: function(outputFile, code, bundle) {
        var pageOptimizer = this.pageOptimizer,
            wrappers = pageOptimizer.bundleWrappers;

        if (wrappers) {
            // there are bundle wrappers but we now need to find out
            // which ones are enabled
            var prefix = [],
                suffix = [];
            
            for (var i = 0; i < wrappers.length; i++) {
                var wrapper = wrappers[i];
                if (pageOptimizer.isWrapperEnabledForBundle(wrapper, bundle)) {
                    if (wrapper.prefix) {
                        prefix.push(wrapper.prefix);
                    }
                    if (wrapper.suffix) {
                        suffix.push(wrapper.suffix);
                    }
                }
            }

            // the prefixes should be written in opposite order so that
            // each prefix lines up with its suffix
            prefix.reverse();

            // add the wrappers to the code
            code = prefix.join('') + code + suffix.join('');
        }

        outputFile.writeAsString(code, "UTF-8");
    },

    writeResource: function(path, context) {

        var pageOptimizer = this.pageOptimizer;
        var _this = this;
        context = context || this.context || {};
        var config = this.config;
        if (!config) {
            throw new Error('"config" is not set for writer');
        }

        return promises.resolved()
            .then(function() {
                if (!path) {
                    throw new Error('"path" argument is required');
                }

                if (typeof path !== 'string') {
                    throw new Error('"path" argument should be a string');
                }

                var resource = new File(path);
                if (!resource.exists()) {
                    throw new Error('Resource not found at path "' + path + '"');
                }

                var data = resource.readAsBinary();
                var filename = resource.getName();
                var outputDir = _this.outputDir;
                var outputFile;
                var checksum;

                var checksumsEnabled = config.checksumsEnabled !== false;
                if (checksumsEnabled) {
                    checksum = pageOptimizer.calculateChecksum(data);
                    var lastDot = filename.lastIndexOf('.');
                    if (lastDot !== -1) {
                        var nameNoExt = filename.substring(0, lastDot);
                        var ext = filename.substring(lastDot+1);
                        filename = nameNoExt + "_" + checksum + "." + ext;
                    }
                    else {
                        filename += "_" + checksum;
                    }
                }

                outputFile = new File(outputDir, filename);
                _this.writeResourceFile(outputFile, data);
                

                return {
                    file: outputFile,
                    filename: filename,
                    checksum: checksum,
                    url: _this.getResourceUrl(filename, context),
                    buffer: data
                };
            });
    },

    writeResourceFile: function(outputFile, data) {
        outputFile.writeAsBinary(data);
    },

    getResourceUrl: function(filename, context) {
        var urlBuilder = this.getUrlBuilder();
        if (!urlBuilder) {
            throw new Error("URL builder not set.");
        }

        context = context || this.context || {};

        return urlBuilder.buildResourceUrl(filename, context);
    },
    
    setUrlBuilder: function(urlBuilder) {
        this.urlBuilder = urlBuilder;
    },
    
    getUrlBuilder: function() {
        return this.urlBuilder;
    }
};

module.exports = OptimizerFileWriter;