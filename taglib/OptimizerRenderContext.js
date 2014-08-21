var EventEmitter = require('events').EventEmitter;

var OptimizerRenderContext = function() {
    OptimizerRenderContext.$super.call(this);
    this._enabledExtensions = null;
    this._waitFor = [];
    this.data = {};
};

OptimizerRenderContext.prototype = {
    onBeforeSlot: function(slotName, cb) {
        this.on('beforeSlot.' + slotName, cb);
    },

    onAfterSlot: function(slotName, cb) {
        this.on('afterSlot.' + slotName, cb);
    },

    emitBeforeSlot: function(slotName, context) {
        this.emit('beforeSlot.' + slotName, {
            context: context,
            slotName: slotName
        });
    },

    emitAfterSlot: function(slotName, context) {
        this.emit('afterSlot.' + slotName, {
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

require('raptor-util').inherit(OptimizerRenderContext, EventEmitter);

module.exports = OptimizerRenderContext;