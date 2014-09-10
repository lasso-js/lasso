require('raptor-polyfill/string/endsWith');
require('raptor-polyfill/string/startsWith');

var fingerprintStream = require('../fingerprint-stream');
var nodePath = require('path');
var fs = require('fs');
var ok = require('assert').ok;
// var logger = require('raptor-logging').logger(module);
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var raptorModulesUtil = require('raptor-modules/util');
var raptorAsync = require('raptor-async');

/**
 * Utility function to generate a random string of characters
 * suitable for use in a filename. This function is needed
 * to generate a temporary file name
 *
 * @param  {int} len The length of the character sequence
 * @return {String} The random characters with the specified length
 */
function randomStr(len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
}

/**
 * This "getUrl(context)" function is added to a bundle instance
 * to provide a mechanism to generate a bundle URL based on a
 * base path that might change. Unless a URL prefix is specififed
 * the URL is generated relative to a base path or the CWD.
 *
 * @param {Object} context An object with contextual information needed to generate a URL
 */
function Bundle_getUrl(context) {
    var url = this.url;

    if (url) {
        return url;
    }

    var outputFile = this.outputFile;
    var urlPrefix = this.urlPrefix;
    var outputDir = this.outputDir;

    ok(context.config, 'context.config expected');
    ok(outputFile, 'outputFile expected');

    if (typeof urlPrefix === 'string') {
        var relPath = outputFile.substring(outputDir.length);
        if (urlPrefix.endsWith('/')) {
            urlPrefix = urlPrefix.slice(0, -1);
        }
        url = urlPrefix + relPath;
        return url;
    } else {
        var basePath =  context.basePath ? nodePath.resolve(process.cwd(), context.basePath) : process.cwd();
        return nodePath.relative(basePath, outputFile).replace(/[\\]/g, '/');
    }
}

module.exports = function fileWriter(fileWriterConfig, optimizerConfig) {
    // The directory to place the optimized bundle and resource files
    var outputDir = nodePath.resolve(process.cwd(), fileWriterConfig.outputDir || 'static');

    // Boolean value to indicate if including fingerprints in the output files is enabled
    // or not.
    var fingerprintsEnabled = fileWriterConfig.fingerprintsEnabled !== false;

    // Optional URL prefix to use when generating URLs to the optimized files
    var urlPrefix = fileWriterConfig.urlPrefix;

    // Boolean value to indicate if the target slot should be added to the output filename
    // e.g. "head" or "body"
    var includeSlotNames = fileWriterConfig.includeSlotNames;

    // If fingerprints are enabled then this flag will be used to determine how many characters
    // the fingerprint should contain
    var fingerprintLength = fileWriterConfig.fingerprintLength || 8;

    /**
     * Internal function help write out a file and to possibly generate a fingerprint
     * in the process if fingerprints are enabled.
     *
     * On success, the callback will be invoked with an object that contains the following
     * properties:
     * - fingerprint: The string fingerprint if calculateFingerprint is set to true
     * - outputFile: The output file. If calculateFingerprint is set to true then the fingerprint
     *               will be injected into the filename
     *
     *
     * @param  {ReadableStream} inStream          The input stream to read from
     * @param  {string}         outputFile        The output file path
     * @param  {boolean}        calculateFingerprint If true then a fingerprint will be calculated and passed to the callback
     * @param  {Function}       callback          The callback function.
     * @return void
     */
    function writeFile(inStream, outputFile, calculateFingerprint, callback) {
        var outputDir = nodePath.dirname(outputFile);

        mkdirp(outputDir, function(err) {

            if (err) {
                return callback(err);
            }

            var outStream;

            if (calculateFingerprint) {
                // Pipe the stream to a temporary file and when the fingerprint is known,
                // rename the file to include the known fingerprint
                var tempFile = outputFile + '.' + process.pid + '.' + randomStr(4);
                var fingerprint = fingerprint;


                outStream = fs.createWriteStream(tempFile, {encoding: 'utf8'});

                var calcFingerprintStream = fingerprintStream();

                outStream
                    .on('close', function() {
                        if (fingerprintLength && fingerprint.length > fingerprintLength) {
                            fingerprint = fingerprint.substring(0, fingerprintLength);
                        }

                        var ext = nodePath.extname(outputFile);
                        outputFile = outputFile.slice(0, 0-ext.length) + '-' + fingerprint + ext;

                        fs.unlink(outputFile, function() {

                            fs.rename(tempFile, outputFile, function(err) {
                                if (err) {
                                    return callback(err);
                                }

                                callback(null, {
                                    fingerprint: fingerprint,
                                    outputFile: outputFile
                                });

                            });
                        });
                    });

                calcFingerprintStream
                    .on('fingerprint', function(_fingerprint) {
                        fingerprint = _fingerprint;
                    })
                    .on('error', callback)
                    .pipe(outStream);

                inStream
                    .on('error', callback)
                    .pipe(calcFingerprintStream);
            } else {
                // No fingerprint is needed so simply pipe out the input stream
                // to the output file
                outStream = fs.createWriteStream(outputFile, {encoding: 'utf8'});

                inStream
                    .on('error', callback)
                    .pipe(outStream);

                outStream.on('close', function() {
                    callback(null, {
                        outputFile: outputFile
                    });
                });
            }
        });
    }

    /**
     * Calculate the output file for  a given bundle given
     * the configuration for the file writer.
     *
     * @param  {raptor-optimizer/lib/Bundle} bundle The optimizer Bundle
     * @return {String} The output file path for the bundle
     */
    function getOutputFileForBundle(bundle) {
        if (bundle.outputFile) {
            return bundle.outputFile;
        }
        var relativePath;

        if (bundle.dependency && bundle.dependency.getSourceFile) {
            relativePath = bundle.dependency.getSourceFile();
        }
        else if (bundle.relativeOutputPath) {
            // We are being told to use a relative path that
            // we should join with the output directory
            relativePath = bundle.relativeOutputPath;
        }

        var targetExt = bundle.getContentType();

        return getOutputFile(
            relativePath,
            bundle.getName(),
            targetExt,
            bundle.getSlot());
    }

    function getOutputFileForResource(path) {
        var relativePath;

        if (optimizerConfig.isBundlingEnabled() === false) {
            // When bundling is disabled we maintain the directory structure
            // so we want to provide the sourceFile so that we can
            // know which deeply nested resource path to use

            var modulePkg;
            try {
                modulePkg = raptorModulesUtil.getModuleRootPackage(nodePath.dirname(path));
            } catch(e) {

            }

            if (modulePkg) {
                relativePath = path.substring(modulePkg.__dirname.length);
                if (modulePkg.__dirname !== optimizerConfig.getProjectRoot()) {
                    var name = modulePkg.name;
                    var version = modulePkg.version;
                    relativePath = name + '-' + version + relativePath;
                }
            } else {
                relativePath = path;
            }
        }

        var filename = nodePath.basename(path);

        return getOutputFile(
            relativePath,
            filename);
    }

    function getOutputFile(relativePath, filename, targetExt, slotName) {

        var outputPath;
        if (relativePath) {
            outputPath = nodePath.join(outputDir, relativePath);
        }


        if (!outputPath) {
            ok(filename, '"filename" or "sourceFile" expected');
            outputPath = nodePath.join(outputDir, filename.replace(/^\//, '').replace(/[^A-Za-z0-9_\-\.]/g, '-'));
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

        if (includeSlotNames) {
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
    }

    function getResourceUrl(path, context) {
        ok(path, 'path is required');
        ok(path.startsWith(outputDir), 'resource expected to be in the output directory. path=' + path + ', outputDir='+outputDir);

        var basePath;

        if (context && context.bundle && context.bundle.isStyleSheet()) {
            // We should calculate a relative path from the CSS bundle to the resource bundle
            basePath = nodePath.dirname(getOutputFileForBundle(context.bundle));
            return nodePath.relative(basePath, path).replace(/[\\]/g, '/');
        }

        if (typeof urlPrefix === 'string') {
            var relPath = path.substring(outputDir.length);
            if (urlPrefix.endsWith('/')) {
                urlPrefix = urlPrefix.slice(0, -1);
            }
            return urlPrefix + relPath;
        } else {
            basePath =  context.basePath ? nodePath.resolve(process.cwd(), context.basePath) : process.cwd();
            return nodePath.relative(basePath, path).replace(/[\\]/g, '/');
        }
    }

    return {
        /**
         * This method is used to determine if writing a bundle
         * should be bypassed.
         *
         * @param  {raptor-optimizer/lib/Bundle} The bundle instance
         * @param  {Object} Contextual information
         * @param  {Function} callback The callback
         * @return {[type]}            [description]
         */
        checkBundleUpToDate: function(bundle, context, callback) {
            callback(null, false);

            // NOTE: We used to do a last modified check based on file modified datas,
            //       but there were edge cases that caused problem. For example, even though
            //       none of the files in the bundle were modified, a separate file that impacts
            //       how the bundle code may be generated may have been modified. The
            //       saves from a timestamp check are minimal.
        },

        checkResourceUpToDate: function(path, context, callback) {
            if (fingerprintsEnabled) {
                return callback(null, false);
            }

            var outputFile = getOutputFileForResource(path);

            var work = {
                sourceLastModified: function(callback) {
                    context.getFileLastModified(path, callback);
                },
                outputLastModified: function(callback) {
                    context.getFileLastModified(outputFile, callback);
                }
            };


            raptorAsync.parallel(work, function(err, results) {
                //console.log(module.id, 'resource update-to-date'.magenta, Date.now() - ts, 'ms', path.grey);

                if (err) {
                    return callback(err);
                }

                if (results.outputLastModified >= results.sourceLastModified) {
                    // The resource has not been modified so let the optimizer
                    // know what URL to use for the resource
                    var url = getResourceUrl(outputFile, context);

                    callback(null, {
                        url: url,
                        outputFile: outputFile
                    });
                } else {
                    // Resource is not up-to-date and needs to be written
                    callback(null, false);
                }
            });
        },

        writeBundle: function(reader, context, callback) {
            var input = reader.readBundle();
            var bundle = context.bundle;

            ok(input, '"input" is required');
            ok(bundle, '"bundle" is required');

            function handleError(e) {
                callback(e);
            }

            input.on('error', handleError);

            var calculateFingerprint = bundle.config.fingerprintsEnabled;
            if (calculateFingerprint === undefined) {
                calculateFingerprint = fingerprintsEnabled;
            }

            calculateFingerprint = calculateFingerprint === true && !bundle.getFingerprint();

            var outputFile = getOutputFileForBundle(bundle);

            writeFile(input, outputFile, calculateFingerprint, function(err, result) {
                if (err) {
                    return handleError(err);
                }

                bundle.setFingerprint(result.fingerprint);
                bundle.setWritten(true);
                bundle.getUrl = Bundle_getUrl;
                bundle.urlPrefix = urlPrefix;
                bundle.outputDir = outputDir;
                bundle.outputFile = result.outputFile;
                callback();
            });
        },

        writeResource: function(reader, context, callback) {
            var input = reader.readResource();
            var path = context.path;

            ok(input, '"input" is required');
            ok(input, '"path" is required');

            function handleError(e) {
                callback(e);
            }

            input.on('error', handleError);

            var calculateFingerprint = fingerprintsEnabled === true;

            writeFile(input, getOutputFileForResource(path), calculateFingerprint, function(err, result) {
                if (err) {
                    handleError(err);
                    return;
                }

                var outputFile = result.outputFile;

                var url = getResourceUrl(outputFile, context);
                callback(null, {
                    url: url,
                    outputFile: outputFile
                });
            });
        }
    };
};
