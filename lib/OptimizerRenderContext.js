var listeners = require('raptor-listeners');

var OptimizerRenderContext = function() {
    this._ob = listeners.createObservable();
    this._enabledExtensions = null;
    this._waitFor = [];
};

OptimizerRenderContext.prototype = {
    onBeforeSlot: function(slotName, cb) {
        this._ob.on('beforeSlot.' + slotName, cb);
    },

    onAfterSlot: function(slotName, cb) {
        this._ob.on('afterSlot.' + slotName, cb);
    },

    emitBeforeSlot: function(slotName, context) {
        this._ob.publish('beforeSlot.' + slotName, {
            context: context,
            slotName: slotName
        });
    },

    emitAfterSlot: function(slotName, context) {
        this._ob.publish('afterSlot.' + slotName, {
            context: context,
            slotName: slotName
        });
    },

    enableExtension: function(extensionName) {
        var extensions = this._enabledExtensions;
        if (!extensions) {
            extensions = this._enabledExtensions = extensions.createExtensionSet();
        }
        extensions.add(extensionName);
    },

    disableExtension: function(extensionName) {
        var extensions = this._enabledExtensions;
        if (extensions) {
            extensions.remove(extensionName);
        }
    },

    getEnabledExtensions: function() {
        return this._enabledExtensions;
    },

    waitFor: function(promise) {
        if (!promise) {
            throw new Error('Invalid waitFor promise');
        }

        if (Array.isArray(promise)) {
            this._waitFor = this._waitFor.concat(promise);
        }
        else {
            this._waitFor.push(promise);    
        }
    },

    getWaitFor: function() {
        return this._waitFor;
    }
};

module.exports = OptimizerRenderContext;