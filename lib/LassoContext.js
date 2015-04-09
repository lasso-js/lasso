var EventEmitter = require('events').EventEmitter;
var lastModified = require('./last-modified');
var cachingFs = require('./caching-fs');
var DeferredReadable = require('./util/DeferredReadable');
var manifestLoader = require('./manifest-loader');
var LassoManifest = require('./LassoManifest');

function LassoContext() {
    LassoContext.$super.call(this);

    this.data = {};
    this.phaseData = {};
    this._phase = null;
    this.cachingFs = cachingFs;

    var nextId = 0;

    this.uniqueId = function() {
        return nextId++;
    };
}

LassoContext.prototype = {
    LassoContext: true,

    deferredStream: function(startFn, options) {
        return new DeferredReadable(startFn, options);
    },

    clearData: function() {
        this.data = {};
    },

    getData: function(name) {
        return this.data[name];
    },

    setData: function(name, value) {
        this.data[name] = value;
    },

    getFileLastModified: function(filePath, callback) {
        return lastModified.forFile(filePath, callback);
    },

    setPhase: function(phaseName) {
        this._phase = phaseName;
        this.phaseData = {}; // Clear out the phase data
    },

    isAsyncBundlingPhase: function() {
        return this._phase === 'async-page-bundle-mappings';
    },

    readPackageFile: function(path) {
        var rawManifest = manifestLoader.load(path);
        return new LassoManifest({
            manifest: rawManifest,
            dependencyRegistry: this.dependencyRegistry
        });
    }
};

require('raptor-util').inherit(LassoContext, EventEmitter);

module.exports = LassoContext;
