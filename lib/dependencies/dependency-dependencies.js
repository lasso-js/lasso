module.exports = {
    properties: {
        dependencies: 'array'
    },

    init: function(lassoContext, callback) {
        callback();
    },

    getDependencies: function(lassoContext, callback) {
        callback(null, this.dependencies || []);
    }
};
