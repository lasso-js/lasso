var raptorPromises = require('raptor-promises');

var Bundle = function(name) {
    this.name = name;
    this.dependencies = [];
    this.slot = "body";
    this.contentType = null;
    this.written = false;
    this.fingerprint = undefined;
    this.inlinePos = false;
    this.url = null;
    this.mergeInline = true;
    this.key = null;

    this.config = {};

    this.code = null;

    /*
     * A bundle does not have any wrappers enabled by default.
     * If wrappers are explicitly set for this bundle then
     * this value will be an object whose keys are wrapper IDs
     * and whose values are boolean values that indicate whether
     * or not that specific wrapper is enabled.
     */
    this.wrappers = undefined;
};

Bundle.getKey = function(dependencySlot, contentType, inlinePos, targetBundleName) {
    return [dependencySlot, contentType, inlinePos ? inlinePos : '', targetBundleName].join('/');
};

Bundle.prototype = {

    lastModified: function(context) {
        var promises = this.dependencies.map(function(d) {
            return raptorPromises.resolved(d.lastModified(context))
                .fail(function() {
                    return -1;
                });
        });

        return raptorPromises.all(promises)
            .then(function(results) {
                var lastModified = -1;

                for (var i=0, len=results.length; i<len; i++) {
                    var curLastModified = results[i];

                    if (curLastModified < 0) {
                        // Unable to calculate the last modified time for
                        // this dependency so mark the entire bundle as being
                        // modified
                        return -1;
                    }

                    lastModified = Math.max(lastModified, curLastModified);
                }

                return lastModified;
            });
    },

    isInline: function() {
        return this.inlinePos != null;
    },
    
    setInlinePos: function(inlinePos) {
        this.inlinePos = inlinePos;
    },

    getInlinePos: function(inline) {
        return this.inlinePos;
    },

    /**
     * This property controls whether or not the inline content
     * gets merged with other inline content targeted for the same position
     * or if remains in standalone <script> or <style> block in the
     * order that it is added
     */
    setMergeInline: function(mergeInline) {
        this.mergeInline = mergeInline;
    },

    isMergeInline: function() {
        return this.mergeInline;
    },
    
    addDependency: function(dependency) {
        this.dependencies.push(dependency);
    },
    
    getDependencies: function() {
        return this.dependencies;
    },
    
    hasDependencies: function() {
        return this.dependencies.length !== 0;
    },
    
    getName: function() {
        return this.name;
    },
    
    getLabel: function() {
        var contentType;
        
        if (this.isJavaScript()) {
            contentType = "js";
        }
        else if (this.isStyleSheet()) {
            contentType = "css";
        }
        else {
            contentType = this.getContentType();
        }
        return '"' + this.getName() + '" (' + contentType + ', ' + this.slot + (this.inlinePos ? ', inlinePos=' + this.inlinePos : '') + ')';
    },
    
    getKey: function() {
        if (!this.key) {
            this.key = Bundle.getKey(this.slot, this.contentType, this.inline, this.name);
        }
        return this.key;
        
    },
    
    getSlot: function() {
        return this.slot;
    },
    
    setSlot: function(slot) {
        this.slot = slot;
    },
    
    getContentType: function() {
        return this.contentType;
    },
    
    setContentType: function(contentType) {
        this.contentType = contentType;
    },
    
    isJavaScript: function() {
        return this.contentType === 'js';
    },
    
    isStyleSheet: function() {
        return this.contentType === 'css';
    },
    
    forEachDependency: function(callback, thisObj) {
        this.dependencies.forEach(callback, thisObj);
    },
    
    getFingerprint: function() {
        return this.fingerprint;
    },

    setFingerprint: function(fingerprint) {
        this.fingerprint = fingerprint;
    },
    
    getCode: function() {
        return this.code;
    },

    setCode: function(code) {
        this.code = code;
    },
    
    isWritten: function() {
        return this.written;
    },
    
    setWritten: function(written) {
        this.written = written !== false;
    },

    setUrl: function(url) {
        this.url = url;
    },

    getUrl: function() {
        return this.url;
    },

    getWrappers: function() {
        return this.config.wrappers;
    },

    setConfig: function(config) {
        this.config = config || {};
    },

    getConfig: function() {
        return this.config;
    },

    toString: function() {

        var details = [this.slot, this.contentType];
        if (this.inlinePos) {
            details.push('inlinePos=' + this.inlinePos);
        }

        return this.name + ' (' + details.join(', ') + ')';
    }
};

module.exports = Bundle;