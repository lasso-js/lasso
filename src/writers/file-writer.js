require('raptor-polyfill/string/endsWith');
require('raptor-polyfill/string/startsWith');

const MAX_FILE_LENGTH = 255;

const promisify = require('pify');
var util = require('../util');
var nodePath = require('path');
var fs = require('fs');
var ok = require('assert').ok;
var logger = require('raptor-logging').logger(module);
var mkdirp = promisify(require('mkdirp'));
var crypto = require('crypto');
var raptorAsync = require('raptor-async');
const Duplex = require('stream').Duplex;
const hashUtil = require('../util/hash');

function filePathToUrlWindows(path) {
    return path.replace(/[\\]/g, '/');
}

function filePathToUrlUnix(path) {
    return path;
}

function enforceFileLengthLimits(path) {
    return path.split(nodePath.sep).map(part => {
        if (part.length < MAX_FILE_LENGTH) return part;
        var overflow = part.slice(MAX_FILE_LENGTH - hashUtil.HASH_OVERFLOW_LENGTH);
        var hash = hashUtil.generate(overflow);
        return part.slice(0, MAX_FILE_LENGTH - hashUtil.HASH_OVERFLOW_LENGTH) + hash.slice(0, hashUtil.HASH_OVERFLOW_LENGTH);
    }).join(nodePath.sep);
}

var filePathToUrl = nodePath.sep === '/' ? filePathToUrlUnix : filePathToUrlWindows;

/**
 * Utility function to generate a random string of characters
 * suitable for use in a filename. This function is needed
 * to generate a temporary file name
 *
 * @param  {int} len The length of the character sequence
 * @return {String} The random characters with the specified length
 */
function randomStr(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len); // return required number of characters
}

/**
 * This "getUrl(lassoContext)" function is added to a bundle instance
 * to provide a mechanism to generate a bundle URL based on a
 * base path that might change. Unless a URL prefix is specififed
 * the URL is generated relative to a base path or the CWD.
 *
 * @param {Object} lassoContext An object with lassoContextual information needed to generate a URL
 */
function getBundleUrl(lassoContext) {
    var url = this.url;

    if (url) {
        return url;
    }

    var outputFile = this.outputFile;
    var urlPrefix = this.urlPrefix;
    var outputDir = this.outputDir;

    ok(lassoContext.config, 'lassoContext.config expected');
    ok(outputFile, 'outputFile expected');

    if (typeof urlPrefix === 'string') {
        var relPath = filePathToUrl(outputFile.substring(outputDir.length));
        if (urlPrefix.endsWith('/')) {
            urlPrefix = urlPrefix.slice(0, -1);
        }
        url = urlPrefix + relPath;
        return url;
    } else {
        var basePath = lassoContext.basePath ? nodePath.resolve(process.cwd(), lassoContext.basePath) : process.cwd();
        return filePathToUrl(nodePath.relative(basePath, outputFile));
    }
}

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
 * @return void
 */
async function writeFile (inStream, outputFile, calculateFingerprint, fingerprintLength) {
    var outputDir = nodePath.dirname(outputFile);
    var done = false;

    await mkdirp(outputDir);

    var outStream;
    var tempFile = outputFile + '.' + process.pid + '.' + randomStr(4);

    return new Promise((resolve, reject) => {
        function handleError(err) {
            if (done) {
                return;
            }

            done = true;
            reject(err);
        }

        function handleSuccess(result) {
            if (done) {
                return;
            }

            done = true;
            resolve(result);
        }

        if (calculateFingerprint) {
            logger.debug(`Writing bundle to temp file ${tempFile}... (calculating fingerprint)`);

            // Pipe the stream to a temporary file and when the fingerprint is known,
            // rename the file to include the known fingerprint

            var fingerprint = fingerprint;
            outStream = fs.createWriteStream(tempFile);
            var fingerprintStream = util.createFingerprintStream();

            outStream
                .on('close', function() {
                    if (done) {
                        return;
                    }

                    if (fingerprintLength && fingerprint.length > fingerprintLength) {
                        fingerprint = fingerprint.substring(0, fingerprintLength);
                    }

                    var ext = nodePath.extname(outputFile);
                    outputFile = outputFile.slice(0, 0 - ext.length) + '-' + fingerprint + ext;

                    fs.stat(outputFile, function (error, stats) {
                        if (error) {
                            fs.rename(tempFile, outputFile, function(err) {
                                if (err && !fs.existsSync(outputFile)) {
                                    return handleError(err);
                                }

                                handleSuccess({
                                    fingerprint: fingerprint,
                                    outputFile: outputFile
                                });
                            });
                        } else {
                            // If it already exists then just use that file, but delete the temp file
                            fs.unlink(tempFile, function() {
                                handleSuccess({
                                    fingerprint: fingerprint,
                                    outputFile: outputFile
                                });
                            });
                        }
                    });
                });

            fingerprintStream
                .on('fingerprint', function(_fingerprint) {
                    fingerprint = _fingerprint;
                })
                .on('error', handleError)
                .pipe(outStream);

            inStream
                .on('error', handleError)
                .pipe(fingerprintStream);
        } else {
            logger.debug(`Writing bundle to temp file ${tempFile}... (no fingerprint)`);

            // No fingerprint is needed so simply pipe out the input stream
            // to the output file
            outStream = fs.createWriteStream(tempFile);

            inStream
                .on('error', handleError)
                .pipe(outStream)
                .on('close', function() {
                    if (done) {
                        return;
                    }

                    fs.rename(tempFile, outputFile, function(err) {
                        if (err && !fs.existsSync(outputFile)) {
                            return handleError(err);
                        }

                        handleSuccess({
                            outputFile: outputFile
                        });
                    });
                });
        }
    });
}

module.exports = function fileWriter(fileWriterConfig, lassoConfig) {
    // The directory to place the built bundle and resource files
    var outputDir = nodePath.resolve(process.cwd(), fileWriterConfig.outputDir || 'static');

    // Boolean value to indicate if including fingerprints in the output files is enabled
    // or not.
    var fingerprintsEnabled = fileWriterConfig.fingerprintsEnabled !== false;

    // Optional URL prefix to use when generating URLs to the bundled files
    var urlPrefix = fileWriterConfig.urlPrefix;

    // Boolean value to indicate if the target slot should be added to the output filename
    // e.g. "head" or "body"
    var includeSlotNames = fileWriterConfig.includeSlotNames;

    // If fingerprints are enabled then this flag will be used to determine how many characters
    // the fingerprint should contain
    var fingerprintLength = fileWriterConfig.fingerprintLength || 8;

    // Boolean value to indicate if CSS URLs should be relative
    var relativeUrlsEnabled = fileWriterConfig.relativeUrlsEnabled;

    /**
     * Calculate the output file for  a given bundle given
     * the configuration for the file writer.
     *
     * @param  {lasso/src/Bundle} bundle The lasso Bundle
     * @return {String} The output file path for the bundle
     */
    function getOutputFileForBundle(bundle) {
        if (bundle.outputFile) {
            return bundle.outputFile;
        }
        var relativePath;

        if (bundle.dependency && bundle.dependency.getSourceFile) {
            relativePath = bundle.dependency.getSourceFile();
        } else if (bundle.relativeOutputPath) {
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

    function getOutputFileFromFileName (path, relativePath) {
        const filename = nodePath.basename(path);

        return getOutputFile(
            relativePath,
            filename);
    }

    function getOutputFileForResource(path, fingerprintsEnabled, lassoContext) {
        var relativePath;

        if (lassoConfig.isBundlingEnabled() === false || fingerprintsEnabled === false) {
            // When bundling is disabled we maintain the directory structure
            // so we want to provide the sourceFile so that we can
            // know which deeply nested resource path to use

            relativePath = lassoContext.getClientPath(path);

            var pageName = lassoContext.pageName;
            var flags = lassoContext.flags;
            if (pageName) {
                var prefix = pageName.replace(/[\\\/]/g, '-');

                if (flags && !flags.isEmpty()) {
                    prefix += '-' + flags.getKey();
                }

                relativePath = prefix + '/' + relativePath;
            }
        }

        return getOutputFileFromFileName(path, relativePath);
    }

    function buildResourceCacheKey(cacheKey, lassoContext) {
        var lassoConfig = lassoContext.config;
        var pageName = lassoContext.pageName;

        if (pageName && (lassoConfig.isBundlingEnabled() === false || fingerprintsEnabled === false)) {
            return pageName + '-' + cacheKey;
        }

        return cacheKey;
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
            ext = basename.substring(lastDot + 1);
            nameNoExt = basename.substring(0, lastDot);
        } else {
            ext = '';
            nameNoExt = basename;
        }

        if (includeSlotNames && slotName) {
            nameNoExt += '-' + slotName;
        }

        basename = nameNoExt;
        if (ext) {
            basename += '.' + ext;
        }

        if (targetExt && ext != targetExt) { // eslint-disable-line eqeqeq
            basename += '.' + targetExt;
        }

        return enforceFileLengthLimits(nodePath.join(dirname, basename));
    }

    function getResourceUrlForHashed (path, lassoContext) {
        var basePath;

        if (lassoContext && lassoContext.bundle && lassoContext.bundle.isStyleSheet() && relativeUrlsEnabled !== false) {
            // We should calculate a relative path from the CSS bundle to the resource bundle
            basePath = nodePath.dirname(getOutputFileForBundle(lassoContext.bundle));
            return filePathToUrl(nodePath.relative(basePath, path));
        }

        if (typeof urlPrefix === 'string') {
            var relPath = filePathToUrl(path.substring(outputDir.length));
            if (urlPrefix.endsWith('/')) {
                urlPrefix = urlPrefix.slice(0, -1);
            }
            return urlPrefix + relPath;
        } else {
            basePath = lassoContext.basePath ? nodePath.resolve(process.cwd(), lassoContext.basePath) : process.cwd();
            return filePathToUrl(nodePath.relative(basePath, path));
        }
    }

    function getResourceUrl (path, lassoContext) {
        ok(path, 'path is required');
        ok(path.startsWith(outputDir), 'resource expected to be in the output directory. path=' + path + ', outputDir=' + outputDir);
        return getResourceUrlForHashed(path, lassoContext);
    }

    return {
        buildResourceCacheKey,

        /**
         * This method is used to determine if writing a bundle
         * should be bypassed.
         *
         * @param  {lasso/src/Bundle} The bundle instance
         * @param  {Object} Contextual information
         * @return {[type]}            [description]
         */
        async checkBundleUpToDate (bundle, lassoContext) {
            return false;
            // NOTE: We used to do a last modified check based on file modified datas,
            //       but there were edge cases that caused problem. For example, even though
            //       none of the files in the bundle were modified, a separate file that impacts
            //       how the bundle code may be generated may have been modified. The
            //       saves from a timestamp check are minimal.
        },

        checkResourceUpToDate: function(path, lassoContext, callback) {
            if (fingerprintsEnabled) {
                return callback(null, false);
            }

            var outputFile = getOutputFileForResource(path, fingerprintsEnabled, lassoContext);

            var work = {
                async sourceLastModified () {
                    return lassoContext.getFileLastModified(path);
                },
                async outputLastModified (callback) {
                    return lassoContext.getFileLastModified(outputFile);
                }
            };

            raptorAsync.parallel(work, function(err, results) {
                if (err) {
                    return callback(err);
                }

                if (results.outputLastModified >= results.sourceLastModified) {
                    // The resource has not been modified so let the lasso
                    // know what URL to use for the resource
                    var url = getResourceUrl(outputFile, lassoContext);

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

        async writeBundle (reader, lassoContext) {
            return new Promise((resolve, reject) => {
                var input = reader.readBundle();
                var bundle = lassoContext.bundle;

                ok(input, '"input" is required');
                ok(bundle, '"bundle" is required');

                input.on('error', reject);

                var calculateFingerprint = bundle.config.fingerprintsEnabled;
                if (calculateFingerprint === undefined) {
                    calculateFingerprint = fingerprintsEnabled;
                }

                calculateFingerprint = calculateFingerprint === true && !bundle.getFingerprint();

                var outputFile = getOutputFileForBundle(bundle);

                logger.debug('Writing bundle "' + bundle.getLabel() + '" to file "' + outputFile + '"...');

                writeFile(input, outputFile, calculateFingerprint, fingerprintLength)
                    .then((result) => {
                        logger.debug('Writing bundle "' + bundle.getLabel() + '" to file "' + outputFile + '" COMPLETED');
                        bundle.setFingerprint(result.fingerprint);
                        bundle.setWritten(true);
                        bundle.getUrl = getBundleUrl;
                        bundle.urlPrefix = urlPrefix;
                        bundle.outputDir = outputDir;
                        bundle.outputFile = result.outputFile;
                        resolve();
                    }).catch((err) => {
                        logger.debug('Writing bundle "' + bundle.getLabel() + '" to file "' + outputFile + '" FAILED! - Error:', err);
                        reject(err);
                    });
            });
        },

        async writeResource (reader, lassoContext) {
            let done = false;

            const input = reader.readResource();
            const path = lassoContext.path;

            ok(input, '"input" is required');
            ok(path, '"path" is required');

            return new Promise((resolve, reject) => {
                function handleError (err) {
                    if (done) {
                        return;
                    }

                    done = true;
                    reject(err);
                }

                input.on('error', handleError);

                const calculateFingerprint = fingerprintsEnabled === true;
                const outputFileForResource = getOutputFileForResource(path, calculateFingerprint, lassoContext);

                writeFile(
                    input,
                    outputFileForResource,
                    calculateFingerprint,
                    fingerprintLength)
                    .then((result) => {
                        const outputFile = result.outputFile;
                        const url = getResourceUrl(outputFile, lassoContext);
                        resolve({ url, outputFile });
                    }).catch(handleError);
            });
        },

        async writeResourceBuffer (buff, lassoContext) {
            let done = false;

            const input = new Duplex();
            input.push(buff);
            input.push(null);

            const path = lassoContext.path;

            ok(input, '"input" is required');
            ok(path, '"path" is required');

            return new Promise((resolve, reject) => {
                function handleError (err) {
                    if (done) {
                        return;
                    }

                    done = true;
                    reject(err);
                }

                input.on('error', handleError);

                const calculateFingerprint = false;
                const outputFileForResource = getOutputFileFromFileName(path, null);

                writeFile(
                    input,
                    outputFileForResource,
                    calculateFingerprint,
                    fingerprintLength)
                    .then((result) => {
                        const outputFile = result.outputFile;
                        const url = getResourceUrlForHashed(outputFile, lassoContext);
                        resolve({ url, outputFile });
                    }).catch(handleError);
            });
        }
    };
};
