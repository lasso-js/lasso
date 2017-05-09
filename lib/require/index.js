var fs = require('fs');
var babel;
var depRequire = require('./dep-require');
var depRequireRemap = require('./dep-require-remap');
var depTransportDef = require('./dep-transport-define');
var depTransportRun = require('./dep-transport-run');
var depTransportInstalled = require('./dep-transport-installed');
var depTransportMain = require('./dep-transport-main');
var depTransportRemap = require('./dep-transport-remap');
var depTransportReady = require('./dep-transport-ready');
var depTransportBuiltin = require('./dep-transport-builtin');
var depTransportSearchPath = require('./dep-transport-search-path');
var depLoaderMetadata = require('./dep-transport-loader-metadata');
var depRuntime = require('./dep-runtime');
var buildPluginConfig = require('./build-plugin-config');
var extend = require('raptor-util').extend;

var requireRegExp = /^require\s+(.*)$/;
var requireRunRegExp = /^require-run\s*:\s*(.*)$/;

/**
 * Lazily load babel... it takes a long time!
 */
function getBabel() {
    if (!babel) {
        babel = require('babel-core');
    }
    return babel;
}

module.exports = exports = function plugin(lasso, userConfig) {

    var defaultProjectRoot = lasso.config.getProjectRoot();
    var config = buildPluginConfig(userConfig, defaultProjectRoot);

    lasso.on('lassoCacheCreated', function(cacheInfo) {
        var lassoCache = cacheInfo.lassoCache;

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
                    return fs.createReadStream(path, {encoding: 'utf8'});
                },

                getLastModified: function(path, lassoContext, callback) {
                    lassoContext.getFileLastModified(path, callback);
                }
            });
    }

    config.extensions.forEach(registerExtension);

    // Extension for babel
    function babelTransformFile(path, callback) {
        'use strict';
        getBabel().transformFile(path, config.getBabelConfig(), function(err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result.code);
        });
    }

    function babelTransformCode(src, callback) {
        var result = getBabel().transform(src, config.getBabelConfig());
        try {
            return callback(null, result.code);
        } catch(e) {
            return callback(e);
        }
    }

    var babelJavaScriptType = lasso.dependencies.createResourceTransformType(function(src, callback) {
        babelTransformCode(src, callback);
    });

    config.babel.extensions.forEach(function(babelExtension) {
        lasso.dependencies.registerJavaScriptType(babelExtension, babelJavaScriptType);

        lasso.dependencies.registerRequireExtension(babelExtension, {
            read: function(path, lassoContext, callback) {
                if (config.isPathWhitelistedForBabel(path)) {
                    babelTransformFile(path, callback);
                } else {
                    return fs.createReadStream(path, { encoding: 'utf8' });
                }
            },

            getLastModified: function(path, lassoContext, callback) {
                lassoContext.getFileLastModified(path, callback);
            }
        });
    });

    lasso.dependencies.registerRequireExtension('json', {
            object: true,

            read: function(path) {
                return fs.createReadStream(path, {encoding: 'utf8'});
            },

            getLastModified: function(path, lassoContext, callback) {
                lassoContext.getFileLastModified(path, callback);
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
            var matches;

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
                var reqDep = {
                    type: 'require',
                    path: dependency.require
                };

                extend(reqDep, dependency);
                delete reqDep.require;

                return reqDep;
            } else if (dependency['require-run']) {
                var reqRunDep = {
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

module.exports.getClientPath = require('lasso-modules-client/transport').getClientPath;