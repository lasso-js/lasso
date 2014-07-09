var EventEmitter = require('events').EventEmitter;
var lastModified = require('./last-modified');

function OptimizerContext() {
    OptimizerContext.$super.call(this);
    
    this.attributes = {};

    var nextId = 0;

    this.uniqueId = function() {
        return nextId++;
    };
}

OptimizerContext.prototype = {

    getAttribute: function(name) {
        return this.attributes[name];
    },

    setAttribute: function(name, value) {
        this.attributes[name] = value;
    },

    getFileLastModified: function(filePath, callback) {
        return lastModified.forFile(filePath, callback);
    }
};

require('raptor-util').inherit(OptimizerContext, EventEmitter);

module.exports = OptimizerContext;