var expect = require('chai').expect;
var fs = require('fs');

exports.getLassoConfig = function(dir) {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        plugins: [
            function myPlugin(lasso, pluginConfig) {
                lasso.dependencies.registerRequireExtension(
                    'foo',
                    {
                        async getDependencies (lassoContext) {
                            return [ require.resolve('./extra.js') ];
                        },

                        async read (path, lassoContext) {
                            var src = fs.readFileSync(path, { encoding: 'utf8' });
                            return 'exports.FOO = ' + JSON.stringify(src) + '; exports.filename = __filename;';
                        }
                    });
            }
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

    expect(window.main.hello.FOO).to.equal('hello');
    expect(window.main.hello.filename).to.contain('hello.foo');

    expect(window.main.world.FOO).to.equal('world');
    expect(window.main.world.filename).to.contain('world.foo');
    expect(window.EXTRA).to.equal(true);
};
