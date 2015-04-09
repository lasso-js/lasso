var Config = require('./Config');
var BundleSetConfig = require('./BundleSetConfig');
var BundleConfig = require('./BundleConfig');
var nodePath = require('path');
var fileWriterFactory = require('./writers/file-writer');
var fs = require('fs');
var ok = require('assert').ok;
var propertyHandlers = require('property-handlers');
var raptorModulesResolver = require('raptor-modules/resolver');
var minifyJSPlugin = require('lasso-minify-js');
var minifyCSSPlugin = require('lasso-minify-css');
var resolveCssUrlsPlugin = require('lasso-resolve-css-urls');
var extend = require('raptor-util/extend');

/*
{
    "projectRoot": "../",
    "fileWriter": {
        "outputDir": "../build",
        "urlPrefix": "/",
        "fingerprintsEnabled": false,
        "includeSlotNames": false
    },
    "bundlingEnabled": false,
    "inPlaceDeployment": {
        "enabled": true,
        "baseUrl": "/src" // file:// will be used unless a URL base is specified
    },
    "flags": ["jquery", "browser"],
    "minifyJs": true,
    "minifyCss": true,
    "resolveCssUrls": true,
    "bundles": [
        {
            "name": "core",
            "dependencies": [
                { "require": "raptor-modules/client" },
                { "require": "marko" }
            ]
        },
        {
            "name": "jquery",
            "dependencies": [
                { "require": "jquery" }
            ]
        }
    ],
    "plugins": [
        "lasso-my-plugin"
    ]
}
 */

function findRootDir(dirname) {
    if (dirname === '' || dirname === '/') {
        return null;
    }

    var packagePath = nodePath.join(dirname, 'package.json');

    if (dirname.indexOf('node_modules') === -1 && fs.existsSync(packagePath)) {
        return dirname;
    }

    var parentDirname = nodePath.dirname(dirname);

    if (parentDirname !== dirname) {
        return findRootDir(parentDirname);
    } else {
        return null;
    }
}

function load(options, baseDir, filename) {
    /* jshint loopfunc:true */

    ok(baseDir, '"baseDir" argument is required');

    function getProjectRootDir(dirname) {
        var rootDir = findRootDir(dirname);
        if (!rootDir) {
            rootDir = baseDir;
        }

        return rootDir;
    }

    if (!options || typeof options !== 'object') {
        throw new Error('Invalid options. Object expected');
    }

    if (options.fileWriter) {
        // Move fileWriter properties to the root
        extend(options, options.fileWriter);
        delete options.fileWriter;
    }

    options = extend({ // Defaults:
        outputDir: 'static',
        urlPrefix: '/static',
        includeSlotNames: false,
        fingerprintsEnabled: true,
        resolveCssUrls: true
    }, options);

    var config = new Config();
    var fileWriterConfig = {};

    function addBundles(bundleSetName, bundles) {
        var bundleSetConfig = new BundleSetConfig(bundleSetName);
        bundles.forEach(function(bundle) {
            var bundleConfig = new BundleConfig(baseDir, filename);
            bundleConfig.name = bundle.name;
            bundleConfig.asyncOnly = bundle.asyncOnly;

            if (bundle.recursive !== undefined) {
                bundleConfig.recurseInto = (bundle.recursive === true) ? 'all': 'none';
            }

            if (bundle.dependencies) {
                bundle.dependencies.forEach(function(d) {
                    // "recursive" is not an allowed dependency
                    // property but we need this property to determine
                    // how to build the bundle. Prefixing with an
                    // underscore allows the property to go through
                    if (d.recursive === true) {
                        d.recurseInto = 'all';
                    }
                    else if (d.recursive === false) {
                        d.recurseInto = 'none';
                    }

                    d._recurseInto = d.recurseInto;
                    delete d.recursive;
                    delete d.recurseInto;
                });
            }
            bundleConfig.addDependencies(bundle.dependencies);
            bundleSetConfig.addBundleConfig(bundleConfig);
        });
        config.addBundleSetConfig(bundleSetConfig);
    }

    var handlers = {

        require: function(value) {
            if (value) {
                extend(config._requirePluginConfig, value);
            }
        },

        minify: function(value) {
            if (value) {
                config.addPlugin(minifyJSPlugin);
                config.addPlugin(minifyCSSPlugin);
            }
        },

        minifyJS: function(value) {
            if (value) {
                config.addPlugin(minifyJSPlugin);
            }
        },

        minifyCSS: function(value) {
            if (value) {
                config.addPlugin(minifyCSSPlugin);
            }
        },

        resolveCssUrls: function(value) {
            if (value) {
                // the value can be a plugin config or a truthy value
                if (value === true) {
                    // value is a boolean so no config was provided so use an empty object
                    value = {};
                }
                config.addPlugin(resolveCssUrlsPlugin, value);
            }
        },

        bundlingEnabled: function(value) {
            config.setBundlingEnabled(value === true);
        },

        bundlingStrategy: function(value) {
            config.setBundlingStrategy(value);
        },

        fingerprintsEnabled: function(value) {
            fileWriterConfig.fingerprintsEnabled = value === true;
        },

        checksumsEnabled: function(value) {
            console.error('"checksumsEnabled" property is deprecated. Use "fingerprintsEnabled" instead. Trace: ' + new Error().stack);
            fileWriterConfig.fingerprintsEnabled = value === true;
        },

        outputDir: function(value) {
            value = nodePath.resolve(baseDir, value);
            fileWriterConfig.outputDir = value;
        },

        urlPrefix: function(value) {
            fileWriterConfig.urlPrefix = value;
        },

        includeSlotNames: function(value) {
            fileWriterConfig.includeSlotNames = value === true;
        },

        fingerprintLength: function(value) {
            fileWriterConfig.fingerprintLength = value;
        },

        flags: function(flags) {
            config.setFlags(flags);
        },

        /**
         * @deprecated
         */
        extensions: function(flags) {
            config.setFlags(flags);
        },

        /**
         * @deprecated
         */
        enabledExtensions: function(flags) {
            config.setFlags(flags);
        },

        bundles: function(bundles) {
            if (bundles) {
                addBundles('default', bundles);
            }
        },

        inPlaceDeploymentEnabled: function(value) {
            config.setInPlaceDeploymentEnabled(value === true);
        },

        inPlaceDeployment: function(inPlaceDeploymentOptions) {
            if (typeof inPlaceDeploymentOptions === 'boolean') {
                config.setInPlaceDeploymentEnabled(inPlaceDeploymentOptions === true);
            }
            else {
                propertyHandlers(inPlaceDeploymentOptions, {
                    enabled: function(value) {
                        config.setInPlaceDeploymentEnabled(value === true);
                    },

                    urlPrefix: function(value) {
                        config.setInPlaceUrlPrefix(value);
                    }
                }, 'config.inPlaceDeployment');
            }

        },

        plugins: function(value) {
            if (value != null) {

                if (!Array.isArray(value)) {
                    value = Object.keys(value).map(function(moduleName) {
                        var pluginConfig = value[moduleName];
                        return {
                            plugin: moduleName,
                            config: pluginConfig
                        };
                    });
                }

                for (var i=0; i<value.length; i++) {
                    var pluginInfo = value[i];

                    if (typeof pluginInfo === 'string' || typeof pluginInfo === 'function') {
                        pluginInfo = {
                            plugin: pluginInfo,
                            config: {}
                        };
                    }


                    if (pluginInfo.plugin === 'lasso-require') {
                        extend(config._requirePluginConfig, pluginInfo.config);
                        continue;
                    }

                    var pluginFunc = null;
                    var pluginConfig = null;
                    var enabled = true;

                    propertyHandlers(pluginInfo, {
                        plugin: function(plugin) {
                            if (typeof plugin === 'string') {
                                var resolvedPath = null;
                                try {
                                    resolvedPath = raptorModulesResolver.serverResolveRequire(plugin, baseDir);
                                } catch(e2) {
                                    throw new Error('Plugin module not found for "' + plugin + '". Searched from "' + baseDir + '"');
                                }
                                pluginFunc = require(resolvedPath);
                            } else {
                                pluginFunc = plugin;
                            }
                        },
                        config: function(value) {
                            pluginConfig = value;
                        },
                        enabled: function(value) {
                            enabled = value;
                        }
                    }, 'config.plugins');

                    pluginConfig = pluginConfig || {};

                    if (enabled === false || pluginConfig.enabled === false) {
                        continue;
                    }

                    config.addPlugin(pluginFunc, pluginConfig);
                }
            }
        },

        projectRoot: function(value) {
            config.setProjectRoot(nodePath.resolve(baseDir, value));
        },

        cacheProfile: function(value) {
            config.setCacheProfile(value);
        },

        cacheDir: function(value) {
            config.setCacheDir(value);
        },

        cacheProfiles: function(value) {
            config.setCacheProfiles(value);
        },

        bundleReadTimeout: function(value) {
            config.setBundleReadTimeout(value);
        }
    };

    propertyHandlers(options, handlers, 'config');

    config.fileWriterConfig = fileWriterConfig;
    config.writer = fileWriterFactory(fileWriterConfig, config);

    if (!config.getProjectRoot()) {
        config.setProjectRoot(getProjectRootDir(baseDir));
    }

    return config;
}



exports.load = load;
