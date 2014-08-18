var EventEmitter = require('events').EventEmitter;
var lastModified = require('./last-modified');
var cachingFs = require('./caching-fs');
var DeferredStream = require('./DeferredStream');

function OptimizerContext() {
    OptimizerContext.$super.call(this);
    
    this.attributes = {};
    this.phaseAttributes = {};
    this._phase = null;
    this.cachingFs = cachingFs;

    var nextId = 0;

    this.uniqueId = function() {
        return nextId++;
    };
}

OptimizerContext.prototype = {

    deferredStream: function(startFn, options) {
        return new DeferredStream(startFn, options);
    },

    clearAttributes: function() {
        this.attributes = {};
    },

    getAttribute: function(name) {
        return this.attributes[name];
    },

    setAttribute: function(name, value) {
        this.attributes[name] = value;
    },

    getFileLastModified: function(filePath, callback) {
        return lastModified.forFile(filePath, callback);
    },

    setPhase: function(phaseName) {
        this._phase = phaseName;
        this.phaseAttributes = {}; // Clear out the phase attributes
    },

    isAsyncBundlingPhase: function() {
        return this._phase === 'async-page-bundle-mappings';
    }
};

require('raptor-util').inherit(OptimizerContext, EventEmitter);

module.exports = OptimizerContext;