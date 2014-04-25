var promises = require('raptor-promises');
var Writer = require('./Writer');
var checksumStream = require('../checksum-stream');
var nodePath = require('path');
var fs = require('fs');
var ok = require('assert').ok;
var logger = require('raptor-logging').logger(module);
var raptorFiles = require('raptor-files');

function lastModified(path) {
    var deferred = promises.defer();

    fs.stat(path, function(err, stat) {
        if (err) {
            deferred.resolve(-1);
            return;
        }
        
        deferred.resolve(stat.mtime.getTime());
    });

    return deferred.promise;
}

function Bundle_getUrl(context) {
    if (this.url) {
        return this.url;
    }

    ok(context.config, 'context.config expected');
    ok(this.outputFile, 'this.outputFile expected');

    var outputFile = this.outputFile;
    var urlPrefix = this.urlPrefix;

    if (urlPrefix) {
        var relPath = outputFile.substring(this.outputDir.length);
        if (urlPrefix.endsWith('/')) {
            urlPrefix = urlPrefix.slice(0, -1);
        }
        this.url = urlPrefix + relPath;
        return this.url;
    } else {
        var basePath =  context.basePath ? nodePath.resolve(process.cwd(), context.basePath) : process.cwd();
        return nodePath.relative(basePath, outputFile).replace(/[\\]/g, '/');
    }
}

function FileWriter(config) {
    FileWriter.$super.apply(this, arguments);

    config = config || {};
    this.outputDir = nodePath.resolve(process.cwd(), config.outputDir || 'static');
    this.checksumsEnabled = config.checksumsEnabled;
    this.urlPrefix = config.urlPrefix;
    this.includeSlotNames = config.includeSlotNames;
    this.checksumLength = config.checksumLength || 8;
}

FileWriter.prototype = {

    calculateChecksum: function(input, resume) {
        checksumStream.calculate(input)
            .on('checksum', function(checksum) {
                resume(this, checksum);
                this.resume();
            });
    },

    checkBundleUpToDate: function(bundle, context) {
        if (this.checksumsEnabled) {
            // We can't check to see if the bundle is up-to-date
            // unless we read in the bundle to calculate a checksum
            // to determine what the output file will be
            return;
        }

        var outputFile = this.getOutputFileForBundle(bundle);
        var outputDir = this.outputDir;
        var bundleLastModified = bundle.lastModified(context);
        var outputLastModified = lastModified(outputFile);
        var urlPrefix = this.urlPrefix;

        return promises.all([bundleLastModified, outputLastModified])
            .then(function(results) {
                var bundleLastModified = results[0];
                var outputLastModified = results[1];

                if (bundleLastModified >= 0 && outputLastModified >= bundleLastModified) {
                    bundle.outputFile = outputFile;
                    bundle.outputDir = outputDir;
                    bundle.urlPrefix = urlPrefix;
                    bundle.getUrl = Bundle_getUrl;
                    bundle.setWritten(true);
                }
            });
    },

    checkResourceUpToDate: function(path, context) {
        var _this = this;

        var outputFile = this.getOutputFileForResource(path, context);
        var inputLastModified = lastModified(path);
        var outputLastModified = lastModified(outputFile);
        
        return promises.all(inputLastModified, outputLastModified)
            .then(function(inputLastModified, outputLastModified) {
                if (outputLastModified > inputLastModified) {
                    var url = _this.getResourceUrl(path, context);

                    return {
                        url: url,
                        outputFile: outputFile
                    };
                }
            });
    },

    doWriteBundle: function(input, bundle) {
        ok(input, '"input" is required');
        ok(bundle, '"bundle" is required');

        var deferred = promises.defer();

        function handleError(e) {
            
            deferred.reject(e);
        }

        input.on('error', handleError);

        var _this = this;
        var urlPrefix = this.urlPrefix;
        var outputDir = this.outputDir;

        var checksumsEnabled = bundle.config.checksumsEnabled;
        if (checksumsEnabled === undefined) {
            checksumsEnabled = this.checksumsEnabled !== false;
        }

        checksumsEnabled = checksumsEnabled === true;

        function pipeOut(input, checksum) {
            if (checksum) {
                bundle.setChecksum(checksum);
            }
            
            var outputFile = _this.getOutputFileForBundle(bundle);
            bundle.outputFile = outputFile;
            
            var fileOut = _this.getBundleFileOutputStream(outputFile);
           
            logger.debug('Piping out bundle "' + bundle + '" to ' + outputFile);

            fileOut.on('error', handleError)
                .on('close', function() {
                    logger.debug('Completed piping out ' + bundle + ' to ' + outputFile);
                    bundle.setWritten(true);
                    bundle.getUrl = Bundle_getUrl;
                    bundle.urlPrefix = urlPrefix;
                    bundle.outputDir = outputDir;
                    deferred.resolve(bundle);
                });

            input.pipe(fileOut);
        }

        if (checksumsEnabled && !bundle.getChecksum()) {
            // Pipe the stream through a checksum calculator that emits
            // a new stream. The new stream object will emit a 'checksum'
            // event when the checksum is calculated
            this.calculateChecksum(input, pipeOut);
        }
        else {
            pipeOut(input);
        }

        return deferred.promise;
    },

    doWriteResource: function(input, path, context) {
        ok(input, '"input" is required');
        ok(input, '"path" is required');

        var deferred = promises.defer();

        function handleError(e) {
            deferred.reject(e);
        }

        input.on('error', handleError);
        
        var _this = this;
        var checksumsEnabled = this.checksumsEnabled;
        
        function pipeOut(input, checksum) {
            var outputFile = _this.getOutputFileForResource(path, checksum);

            return input.pipe(_this.getResourceFileOutputStream(outputFile))
                .on('error', handleError)
                .on('close', function() {
                    var url = _this.getResourceUrl(outputFile, context);
                    deferred.resolve({
                        url: url,
                        outputFile: outputFile
                    });
                });
        }

        if (checksumsEnabled) {
            // Pipe the stream through a checksum calculator that emits
            // a new stream. The new stream object will emit a 'checksum'
            // event when the checksum is calculated
            this.calculateChecksum(input, pipeOut);
        }
        else {
            pipeOut(input);
        }

        return deferred.promise;
    },

    getOutputFileForBundle: function(bundle) {
        if (bundle.outputFile) {
            return bundle.outputFile;
        }
        var relativePath;

        if (bundle.dependency && bundle.dependency.getSourceFile) {
            relativePath = bundle.dependency.getSourceFile();
        }
        else if (bundle.relativeOutputPath) {
            relativePath = bundle.relativeOutputPath;
        }

        var targetExt = bundle.getContentType();

        var outputFile = bundle.outputFile = this.getOutputFile(
            relativePath, 
            bundle.getName(), 
            bundle.getChecksum(), 
            targetExt,
            bundle.getSlot());

        if (this.checksumsEnabled && !bundle.getChecksum()) {
            bundle.outputFile = null;
        }

        return outputFile;
    },

    getOutputFileForResource: function(path, checksum) {
        var relativePath;

        if (this.config.isBundlingEnabled() === false) {
            // When bundling is disabled we maintain the directory structure
            // so we want to provide the sourceFile so that we can
            // know which deeply nested resource path to use

            var modulePkg;
            try {
                modulePkg = require('raptor-modules/util').getModuleRootPackage(nodePath.dirname(path));    
            } catch(e) {
                
            }
            
            if (modulePkg) {
                var projectRoot = this.config.getProjectRoot();
                relativePath = path.substring(modulePkg.__dirname.length);
                if (modulePkg.__dirname !== projectRoot) {
                    var name = modulePkg.name;
                    var version = modulePkg.version;
                    relativePath = name + '-' + version + relativePath;
                }
            } else {
                relativePath = path;
            }
        }

        var filename = nodePath.basename(path);

        return this.getOutputFile(
            relativePath, 
            filename, 
            checksum);
    },

    getOutputFile: function(relativePath, filename, checksum, targetExt, slotName) {

        var outputPath;
        if (relativePath) {
            outputPath = nodePath.join(this.outputDir, relativePath);
        }
        

        if (!outputPath) {
            ok(filename, '"filename" or "sourceFile" expected');
            outputPath = nodePath.join(this.outputDir, filename.replace(/^\//, '').replace(/[^A-Za-z0-9_\-\.]/g, '-'));
        }        

        var dirname = nodePath.dirname(outputPath);
        var basename = nodePath.basename(outputPath);

        var lastDot = basename.lastIndexOf('.');
        var ext;
        var nameNoExt;

        if (lastDot !== -1) {
            ext = basename.substring(lastDot+1);
            nameNoExt = basename.substring(0, lastDot);
        }
        else {
            ext = '';
            nameNoExt = basename;
        }

        if (checksum) {
            if (this.checksumLength && checksum.length > this.checksumLength) {
                checksum = checksum.substring(0, this.checksumLength);
            }
            nameNoExt += '-' + checksum;
        }

        if (this.includeSlotNames) {
            nameNoExt += '-' + slotName;
        }

        
        basename = nameNoExt;
        if (ext) {
            basename += '.' + ext;
        }

        if (targetExt && ext != targetExt) {
            basename += '.' + targetExt;
        }

        return nodePath.join(dirname, basename);
    },

    getResourceUrl: function(path, context) {
        ok(path, 'path is required');
        ok(path.startsWith(this.outputDir), 'resource expected to be in the output directory');

        var urlPrefix = this.urlPrefix;

        var basePath;

        if (context && context.bundle && context.bundle.isStyleSheet()) {
            // We should calculate a relative path from the CSS bundle to the resource bundle
            basePath = nodePath.dirname(this.getOutputFileForBundle(context.bundle));
            return nodePath.relative(basePath, path).replace(/[\\]/g, '/');
        }

        if (urlPrefix) {
            var relPath = path.substring(this.outputDir.length);
            if (urlPrefix.endsWith('/')) {
                urlPrefix = urlPrefix.slice(0, -1);
            }
            return urlPrefix + relPath;
        } else {
            basePath =  context.basePath ? nodePath.resolve(process.cwd(), context.basePath) : process.cwd();
            return nodePath.relative(basePath, path).replace(/[\\]/g, '/');
        }
    },

    getBundleFileOutputStream: function(file) {
        raptorFiles.mkdirs(file);
        return fs.createWriteStream(file, {encoding: 'utf8'});
    },

    getResourceFileOutputStream: function(file) {
        raptorFiles.mkdirs(file);
        return fs.createWriteStream(file, {encoding: 'utf8'});
    },
    
    setUrlBuilder: function(urlBuilder) {
        this.urlBuilder = urlBuilder;
    },
    
    getUrlBuilder: function() {
        return this.urlBuilder;
    }
};

require('raptor-util').inherit(FileWriter, Writer);

module.exports = FileWriter;