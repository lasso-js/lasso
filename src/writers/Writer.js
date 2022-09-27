const nodePath = require('path');
const fileSep = nodePath.sep;
const logger = require('raptor-logging').logger(module);
const EventEmitter = require('events').EventEmitter;
const extend = require('raptor-util').extend;
const createError = require('raptor-util/createError');
const reader = require('../reader');
const ok = require('assert').ok;
const equal = require('assert').equal;

async function initWriter (writer, lassoContext) {
    if (!writer._initialized && writer.impl.init) {
        await writer.impl.init(lassoContext);
        writer._initialized = true;
    }
}

function Writer(impl) {
    Writer.$super.call(this);
    this.impl = impl || {};

    // Lasso writer `init` function should only be called once. We call it the
    // first time that either writing a resource or bundle is attempted.
    this._initialized = false;
}

Writer.prototype = {
    __LassoWriter: true,

    setLasso: function(lasso) {
        this.lasso = lasso;
    },

    getLasso: function() {
        return this.lasso;
    },

    getInPlaceUrlForFile: function(path, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        if (typeof path !== 'string') {
            throw new Error('Path for in-place file should be a string. Actual: ' + path);
        }

        const config = lassoContext.config;

        if (typeof config.getInPlaceUrlPrefix() === 'string') {
            const projectRoot = config.getProjectRoot();
            if (projectRoot && path.startsWith(projectRoot + fileSep)) {
                const suffix = path.substring(projectRoot.length);
                return config.getInPlaceUrlPrefix() + suffix;
            }
        }

        return null;
    },

    getInPlaceUrlForBundle: function(bundle, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        const dependency = bundle.dependency;
        if (!dependency) {
            throw new Error('"dependency" expected for in-place bundle');
        }

        if (!dependency.getSourceFile) {
            throw new Error('"getSourceFile" expected for in-place dependency');
        }

        if (!bundle.inPlaceDeployment) {
            throw new Error('inPlaceDeployment should be true');
        }

        const sourceFile = dependency.getSourceFile();
        return this.getInPlaceUrlForFile(sourceFile, lassoContext);
    },

    async writeBundle (bundle, onBundleWrittenCallback, lassoContext) {
        if (!bundle.hasContent()) return;

        ok(lassoContext, 'lassoContext is required');

        const done = (err) => {
            if (err) {
                throw createError('Error while writing bundle "' + bundle + '" Error: ' + err, err);
            }

            bundle.setWritten(true);

            if (onBundleWrittenCallback) {
                onBundleWrittenCallback(bundle);
            }

            const data = { bundle };

            this.emit('bundleWritten', data);
            lassoContext.emit('bundleWritten', data);

            logger.info('Bundle ' + bundle + ' written.');

            return bundle;
        };

        if (bundle.isWritten() || bundle.url) {
            if (logger.isInfoEnabled()) {
                logger.info('Bundle (' + bundle.getKey() + ') already written. Skipping writing...');
            }

            return done();
        } else if ((bundle.inPlaceDeployment === true) && !bundle.isInline()) {
            const inPlaceUrl = this.getInPlaceUrlForBundle(bundle, lassoContext);
            if (inPlaceUrl) {
                if (logger.isInfoEnabled()) {
                    logger.info('In-place deployment enabled for (' + bundle.getKey() + '). Skipping writing...');
                }
                bundle.setUrl(inPlaceUrl);
                return done();
            }
        }

        lassoContext = Object.create(lassoContext);
        lassoContext.bundle = bundle;
        lassoContext.dependencies = bundle.dependencies;

        const bundleReader = reader.createBundleReader(bundle, lassoContext);

        logger.info('Writing bundle ' + bundle + '...');

        const checkBundleUpToDate = async () => {
            if (bundle.isInline()) return;
            // We make the assumption that the bundle was populated with its URL
            // and marked as written if it was indeed up-to-date
            return this.checkBundleUpToDate(bundle, lassoContext);
        };

        const writeBundle = async () => {
            // If the bundle is written then there is nothing to do
            if (bundle.isWritten()) return;

            let completed = false;

            function handleError(e) {
                if (!completed) {
                    completed = true;
                    throw e;
                }
            }

            if (bundle.isInline()) {
                try {
                    const code = await bundleReader.readBundleFully();
                    logger.info('Code for inline bundle ' + bundle.getLabel() + ' generated.');
                    bundle.setCode(code);
                } catch (err) {
                    return handleError(err);
                }
            } else {
                try {
                    await this.impl.writeBundle(bundleReader, lassoContext);
                    logger.info('Bundle written:', bundle.getLabel());
                } catch (err) {
                    return handleError(err);
                }
            }
        };

        await checkBundleUpToDate();
        await writeBundle();

        return done();
    },

    async writeResource (path, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        const done = (writeResult) => {
            ok(writeResult, 'writeResult expected');
            ok(writeResult.url, 'writeResult.url expected');

            const result = extend(writeResult || {}, {
                sourceFile: path
            });

            this.emit('resourceWritten', result);
            lassoContext.emit('resourceWritten', result);

            return result;
        };

        const config = this.config;

        if (config.isInPlaceDeploymentEnabled()) {
            const url = this.getInPlaceUrlForFile(path, lassoContext);
            if (url) {
                return done({ url });
            }
        }

        lassoContext = Object.create(lassoContext);
        lassoContext.path = path;

        const resourceReader = reader.createResourceReader(path, lassoContext);

        try {
            await initWriter(this, lassoContext);
            const writeResult = await this.impl.writeResource(resourceReader, lassoContext);
            return done(writeResult);
        } catch (err) {
            throw createError('Error while writing resource "' + path + '": ' + (err.stack || err), err);
        }

        // this.checkResourceUpToDate(path, lassoContext, function(err, resourceInfo) {
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

    async writeResourceBuffer (buff, path, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        const done = (writeResult) => {
            ok(writeResult, 'writeResult expected');
            ok(writeResult.url, 'writeResult.url expected');

            writeResult = writeResult || {};

            this.emit('resourceWritten', writeResult);
            lassoContext.emit('resourceWritten', writeResult);

            return writeResult;
        };

        lassoContext = Object.create(lassoContext);
        lassoContext.path = path;

        try {
            await initWriter(this, lassoContext);
            const writeResult = await this.impl.writeResourceBuffer(buff, lassoContext);
            return done(writeResult);
        } catch (err) {
            throw createError('Error while writing resource buffer: ', err);
        }
    },

    async checkBundleUpToDate (bundle, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        if (this.impl.checkBundleUpToDate) {
            const resourceInfo = await this.impl.checkBundleUpToDate(bundle, lassoContext);
            return resourceInfo === false ? null : resourceInfo;
        }
    },

    checkResourceUpToDate: function(path, lassoContext, callback) {
        ok(lassoContext, 'lassoContext is required');
        equal(typeof callback, 'function', 'callback function is required');

        if (this.impl.checkResourceUpToDate) {
            this.impl.checkResourceUpToDate(path, lassoContext, function(err, resourceInfo) {
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

    async writeBundles (iteratorFunc, onBundleWrittenCallback, lassoContext) {
        ok(lassoContext, 'lassoContext is required');

        await initWriter(this, lassoContext);
        let promise = Promise.resolve();

        iteratorFunc((bundle) => {
            if (bundle.hasContent()) {
                promise = promise.then(() => {
                    return this.writeBundle(bundle, onBundleWrittenCallback, lassoContext);
                });
            }
        });

        return promise;
    },

    buildResourceCacheKey(cacheKey, lassoContext) {
        if (this.impl.buildResourceCacheKey) {
            return this.impl.buildResourceCacheKey(cacheKey, lassoContext);
        } else {
            return cacheKey;
        }
    }
};

require('raptor-util').inherit(Writer, EventEmitter);

module.exports = Writer;
