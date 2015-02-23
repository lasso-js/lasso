var contentTypes = require('./content-types');

var Bundle = function(name) {
    this.name = name;
    this.dependencies = [];
    this.slot = 'body';
    this.contentType = null;
    this.written = false;
    this.fingerprint = undefined;
    this.inlinePos = false;
    this.url = null;
    this.mergeInline = true;
    this.key = null;

    this.config = {};

    this.code = null;

    this.data = {};
};

Bundle.getKey = function(dependencySlot, contentType, inlinePos, targetBundleName) {
    return [dependencySlot, contentType, (inlinePos == null) ? '' : inlinePos.toString(), targetBundleName].join('/');
};

Bundle.prototype = {
    isInline: function() {
        return this.inlinePos != null;
    },

    setInlinePos: function(inlinePos) {
        this.inlinePos = inlinePos;
    },

    getInlinePos: function(inline) {
        return this.inlinePos;
    },

    isAsyncOnly: function() {
        return this.config.asyncOnly;
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
        var index = this.dependencies.length;
        this.dependencies.push(dependency);
        return index;
    },

    removeDependencyByIndex: function(index) {
        this.dependencies[index] = undefined;
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
            contentType = contentTypes.JS;
        }
        else if (this.isStyleSheet()) {
            contentType = contentTypes.CSS;
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

    hasContent: function() {
        return (this.contentType !== contentTypes.NONE);
    },

    isJavaScript: function() {
        return this.contentType === contentTypes.JS;
    },

    isStyleSheet: function() {
        return this.contentType === contentTypes.CSS;
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
