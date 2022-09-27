const fs = require('fs');
const depRequire = require('./dep-require');
const depRequireRemap = require('./dep-require-remap');
const depTransportDef = require('./dep-transport-define');
const depTransportRun = require('./dep-transport-run');
const depTransportInstalled = require('./dep-transport-installed');
const depTransportMain = require('./dep-transport-main');
const depTransportRemap = require('./dep-transport-remap');
const depTransportReady = require('./dep-transport-ready');
const depTransportBuiltin = require('./dep-transport-builtin');
const depTransportSearchPath = require('./dep-transport-search-path');
const depLoaderMetadata = require('./dep-transport-loader-metadata');
const depRuntime = require('./dep-runtime');
const buildPluginConfig = require('./build-plugin-config');
const extend = require('raptor-util').extend;

const requireRegExp = /^require\s+(.*)$/;
const requireRunRegExp = /^require-run\s*:\s*(.*)$/;

module.exports = exports = function plugin(lasso, userConfig) {
    const defaultProjectRoot = lasso.config.getProjectRoot();
    const config = buildPluginConfig(userConfig, defaultProjectRoot);

    lasso.on('lassoCacheCreated', function(cacheInfo) {
        const lassoCache = cacheInfo.lassoCache;

        lassoCache.configureCacheDefaults({
            '*': { // Any profile
                'lasso-require/inspect': {
                    store: 'disk',
                    encoding: 'utf8',
                    valueType: 'json'
                },
                'lasso-require/transformed': {
                    store: 'disk',
                    singleFile: false,
                    encoding: 'utf8'
                }
            }
        });
    });

    function registerExtension(ext) {
        lasso.dependencies.registerRequireExtension(ext, {
            read: function(path) {
                return fs.createReadStream(path, { encoding: 'utf8' });
            },

            async getLastModified (path, lassoContext) {
                return lassoContext.getFileLastModified(path);
            }
        });
    }

    config.extensions.forEach(registerExtension);

    lasso.dependencies.registerRequireExtension('json', {
        object: true,

        read: function(path) {
            return fs.createReadStream(path, { encoding: 'utf8' });
        },

        getLastModified (path, lassoContext) {
            return lassoContext.getFileLastModified(path);
        }
    });

    lasso.dependencies.registerJavaScriptType('commonjs-def', depTransportDef.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-run', depTransportRun.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-installed', depTransportInstalled.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-main', depTransportMain.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-remap', depTransportRemap.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-ready', depTransportReady.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-search-path', depTransportSearchPath.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-runtime', depRuntime.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('commonjs-builtin', depTransportBuiltin.create(config, lasso));
    lasso.dependencies.registerJavaScriptType('loader-metadata', depLoaderMetadata.create(config, lasso));

    lasso.dependencies.registerPackageType('require', depRequire.create(config, lasso));
    lasso.dependencies.registerPackageType('require-remap', depRequireRemap.create(config, lasso));

    lasso.dependencies.addNormalizer(function(dependency) {
        if (typeof dependency === 'string') {
            let matches;

            if ((matches = requireRegExp.exec(dependency))) {
                return {
                    type: 'require',
                    path: matches[1]
                };
            } else if ((matches = requireRunRegExp.exec(dependency))) {
                return {
                    type: 'require',
                    path: matches[1],
                    run: true
                };
            }
        } else if (!dependency.type) {
            if (dependency.require) {
                const reqDep = {
                    type: 'require',
                    path: dependency.require
                };

                extend(reqDep, dependency);
                delete reqDep.require;

                return reqDep;
            } else if (dependency['require-run']) {
                const reqRunDep = {
                    type: 'require',
                    run: true,
                    path: dependency['require-run']
                };

                extend(reqRunDep, dependency);
                delete reqRunDep['require-run'];

                return reqRunDep;
            }
        }
    });
};

// module.exports.getClientPath = require('lasso-modules-client/transport').getClientPath;
