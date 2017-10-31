module.exports = function(lasso, config) {
    lasso.config.writer = {
        async init (lassoContext) {
            module.exports.counter.push('init');
            await Promise.resolve();
        },

        async writeBundle (reader, lassoContext) {
            const bundle = lassoContext.bundle;
            bundle.url = 'test.com';
            module.exports.counter.push('writeBundle');
        },

        async writeResource (reader, lassoContext) {
            module.exports.counter.push('writeResource');
            return { url: 'test.com' };
        }
    };
};

module.exports.counter = [];
