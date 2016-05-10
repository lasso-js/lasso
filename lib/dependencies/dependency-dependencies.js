module.exports = {
    properties: {
        dependencies: 'array'
    },

    init: function(lassoContext, callback) {
        callback();
    },

    getDependencies: function(lassoContext, callback) {
        callback(null, this.dependencies || []);
    },

    calculateKey: function() {
        return null; // A just use a unique ID for this dependency
    }
};
