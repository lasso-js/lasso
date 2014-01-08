var File = require('raptor-files').File;
var promises = require('raptor-promises');
var Writer = require('./Writer');
var checksum = require('./checksum');
var nodePath = require('path');
var mime = require('mime');
var fs = require('fs');
var ok = require('assert').ok;

function FileWriter(config) {
    FileWriter.$super.apply(this, arguments);

    config = config || {};
    this.outputDir = nodePath.resolve(process.cwd(), config.outputDir || 'build');
    this.checksumsEnabled = config.checksumsEnabled;
    this.urlPrefix = config.urlPrefix;
    this.includeSlotNames = config.includeSlotNames;
    this.checksumLength = config.checksumLength || 8;
}

FileWriter.prototype = {
    doWriteBundle: function(input, bundle) {
        ok(input, '"input" is required');
        ok(bundle, '"bundle" is required');

        var deferred = promises.defer();

        function handleError(e) {
            deferred.reject(e);
        }

        input.on('error', handleError);

        var _this = this;
        var checksumsEnabled = bundle.config.checksumsEnabled;
        if (checksumsEnabled === undefined) {
            checksumsEnabled = this.checksumsEnabled !== false;
        }

        checksumsEnabled = checksumsEnabled === true;

        function pipeOut(input) {
            var outputFile = _this.getOutputFileForBundle(bundle);
            bundle.outputFile = outputFile;


            return input.pipe(_this.getBundleFileOutputStream(outputFile))
                .on('error', handleError)
                .on('close', function() {
                    bundle.setUrl(_this.getBundleUrl(bundle));
                    deferred.resolve(bundle);
                });
        }

        if (checksumsEnabled && !bundle.getChecksum()) {
            // Pipe the stream through a checksum calculator that emits
            // a new stream. The new stream object will emit a 'checksum'
            // event when the checksum is calculated
            checksum.pipe(input)
                .pause()
                .on('checksum', function(checksum) {
                    bundle.setChecksum(checksum);
                    pipeOut(this);
                    this.resume();
                });
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
            checksum.pipe(input)
                .pause()
                .on('checksum', function(checksum) {
                    
                    pipeOut(this, checksum);
                    this.resume();
                });
        }
        else {
            pipeOut(input);
        }

        return deferred.promise;
    },

    getOutputFileForBundle: function(bundle) {
        var sourceFile;

        if (bundle.dependency && bundle.dependency.getSourceFile) {
            sourceFile = bundle.dependency.getSourceFile();
        }

        var targetExt = mime.extension(bundle.getContentType());

        return this.getOutputFile(
            sourceFile, 
            bundle.getName(), 
            bundle.getChecksum(), 
            targetExt,
            bundle.getSlot());
    },

    getOutputFileForResource: function(path, checksum) {
        var sourceFile;

        if (this.config.isInPlaceDeploymentEnabled()) {
            sourceFile = path;
        }

        var filename = nodePath.basename(path);

        return this.getOutputFile(
            sourceFile, 
            filename, 
            checksum);
    },

    getOutputFile: function(sourceFile, filename, checksum, targetExt, slotName) {

        var outputPath;
        var projectRoot = this.config.getProjectRoot();

        if (sourceFile && projectRoot && sourceFile.startsWith(projectRoot)) {
            // Let's rebase the output bundle at the project root
            outputPath = nodePath.join(this.outputDir, sourceFile.substring(projectRoot.length));
        }

        if (!filename && sourceFile) {
            filename = nodePath.basename(sourceFile);
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

    getBundleUrl: function(bundle) {
        ok(bundle, 'bundle is required');
        ok(bundle.outputFile, 'bundle.outputFile expected');
        var outputFile = bundle.outputFile;
        ok(outputFile.startsWith(this.outputDir), 'Output bundle file expected to be in the output directory');

        var urlPrefix = this.urlPrefix;

        if (urlPrefix) {
            var relPath = outputFile.substring(this.outputDir.length);
            if (urlPrefix.endsWith('/')) {
                urlPrefix = urlPrefix.slice(0, -1);
            }
            return urlPrefix + relPath;
        }
        else {
            var basePath = this.context.basePath;
            if (basePath) {
                
                return nodePath.relative(basePath, outputFile).replace(/[\\]/g, '/');
            }
            else {
                basePath = nodePath.dirname(this.outputDir);
                return outputFile.substring(basePath.length);
            }
        }
    },

    getResourceUrl: function(path, context) {
        ok(path, 'path is required');
        ok(path.startsWith(this.outputDir), 'resource expected to be in the output directory');

        var urlPrefix = this.urlPrefix;

        var basePath;

        if (context && context.bundle && context.bundle.isStyleSheet()) {
            // We should calculate a relative path from the CSS bundle to the resource bundle
            basePath = nodePath.dirname(this.getOutputFileForBundle(context.bundle));
        }

        if (basePath) {
            return nodePath.relative(basePath, path).replace(/[\\]/g, '/');
        }
        else if (urlPrefix) {
            var relPath = path.substring(this.outputDir.length);
            if (urlPrefix.endsWith('/')) {
                urlPrefix = urlPrefix.slice(0, -1);
            }
            return urlPrefix + relPath;
        }
        else {
            basePath = nodePath.dirname(this.outputDir);
            return path.substring(basePath.length);
        }
    },

    getBundleFileOutputStream: function(file) {
        return fs.createWriteStream(file, {encoding: 'utf8'});
    },

    getResourceFileOutputStream: function(file) {
        return fs.createWriteStream(file, {encoding: 'utf8'});
    },

    writeResourceFile: function(outputFile, data) {
        outputFile.writeAsBinary(data);
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