const EventEmitter = require('events').EventEmitter;
const lastModified = require('./last-modified');
const cachingFs = require('./caching-fs');
const DeferredReadable = require('./util/DeferredReadable');
const manifestLoader = require('./manifest-loader');
const LassoManifest = require('./LassoManifest');
const util = require('./util');
const getClientPath = require('lasso-modules-client/transport').getClientPath;
const resolve = require('./resolve');

class LassoContext extends EventEmitter {
    constructor() {
        super();

        this.data = {};
        this.phaseData = {};
        this._phase = null;
        this.cachingFs = cachingFs;

        let nextId = 0;

        this.uniqueId = function() {
            return nextId++;
        };
    }

    deferredStream(startFn, options) {
        return new DeferredReadable(startFn, options);
    }

    /**
     * Converts a "reader" function to a function that *always* returns a stream.
     * The actual reader function may return a promise, a String, a stream or it may use a callback.
     */
    createReadStream(func) {
        return util.readStream(func);
    }

    clearData() {
        this.data = {};
    }

    getData(name) {
        return this.data[name];
    }

    setData(name, value) {
        this.data[name] = value;
    }

    async getFileLastModified (filePath) {
        const lastModifiedResult = await lastModified.forFile(filePath);
        return lastModifiedResult || -1;
    }

    setPhase(phaseName) {
        this._phase = phaseName;
        this.phaseData = {}; // Clear out the phase data
    }

    isPageBundlingPhase() {
        return this._phase === 'page-bundle-mappings';
    }

    isAppBundlingPhase() {
        return this._phase === 'app-bundle-mappings';
    }

    isAsyncBundlingPhase() {
        return this._phase === 'async-page-bundle-mappings';
    }

    readPackageFile(path) {
        const rawManifest = manifestLoader.load(path);
        return new LassoManifest({
            manifest: rawManifest,
            dependencyRegistry: this.dependencyRegistry
        });
    }

    createFingerprintStream() {
        return util.createFingerprintStream();
    }

    getClientPath(file) {
        return getClientPath(file);
    }

    getResolver() {
        if (this.resolver === undefined) {
            this.resolver = resolve.createResolver(this, getClientPath);
        }
        return this.resolver;
    }

    resolve(targetModule, fromDir, options) {
        return this.getResolver().resolve(targetModule, fromDir, options);
    }

    resolveCached(targetModule, fromDir, options) {
        return this.getResolver().resolveCached(targetModule, fromDir, options);
    }

    getProjectRoot() {
        return this.config.getProjectRoot();
    }
}

LassoContext.prototype.LassoContext = true;

module.exports = LassoContext;
