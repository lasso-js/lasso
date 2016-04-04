module.exports = {
    properties: {
        dependencies: 'array'
    },

    init: function(lassoContext) {
    },

    getDependencies: function(lassoContext, callback) {
        callback(null, this.dependencies || []);
    }
};
