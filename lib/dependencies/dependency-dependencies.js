module.exports = {
    properties: {
        dependencies: 'array'
    },

    async init (lassoContext) {},

    async getDependencies (lassoContext) {
        return this.dependencies || [];
    },

    calculateKey () {
        return null; // A just use a unique ID for this dependency
    }
};
