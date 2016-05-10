'use strict';

var EventEmitter = require('events').EventEmitter;
var lastModified = require('./last-modified');
var cachingFs = require('./caching-fs');
var DeferredReadable = require('./util/DeferredReadable');
var manifestLoader = require('./manifest-loader');
var LassoManifest = require('./LassoManifest');
var util = require('./util');
var getClientPath = require('lasso-require').getClientPath;

class LassoContext extends EventEmitter {

    constructor() {
        super();

        this.data = {};
        this.phaseData = {};
        this._phase = null;
        this.cachingFs = cachingFs;

        var nextId = 0;

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

    getFileLastModified(filePath, callback) {
        return lastModified.forFile(filePath, callback);
    }

    setPhase(phaseName) {
        this._phase = phaseName;
        this.phaseData = {}; // Clear out the phase data
    }

    isAsyncBundlingPhase() {
        return this._phase === 'async-page-bundle-mappings';
    }

    readPackageFile(path) {
        var rawManifest = manifestLoader.load(path);
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

    getProjectRoot() {
        return this.config.getProjectRoot();
    }
}

LassoContext.prototype.LassoContext = true;

module.exports = LassoContext;
