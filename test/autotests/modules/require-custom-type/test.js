var expect = require('chai').expect;

function fooPlugins(lasso, config) {
    lasso.dependencies.registerJavaScriptType('foo', {
        properties: {
            'path': 'string'
        },

        async init (context) {
            if (!this.path) {
                throw new Error('"path" is required');
            }

            this.path = this.resolvePath(this.path);
        },

        // Read the resource:
        read: function(context, callback) {
            return callback(null, 'var foo = true;');
        }
    });
}

exports.getLassoConfig = function() {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        plugins: [
            fooPlugins
        ]
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
};
