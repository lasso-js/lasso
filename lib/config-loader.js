var Config = require('./Config');
var BundleSetConfig = require('./BundleSetConfig');
var BundleConfig = require('./BundleConfig');
var nodePath = require('path');
var FileWriter = require('./writers/FileWriter');
var fs = require('fs');
var ok = require('assert').ok;
var propertyHandlers = require('property-handlers');
var raptorCache = require('raptor-cache');
var raptorModulesResolver = require('raptor-modules/resolver');
var util = require('util');

/*
{
    "projectRoot": "../",
    "fileWriter": {
        "outputDir": "../build",
        "urlPrefix": "/",
        "checksumsEnabled": false,
        "includeSlotNames": false
    },
    "bundlingEnabled": false,
    "inPlaceDeployment": {
        "enabled": true,
        "baseUrl": "/src" // file:// will be used unless a URL base is specified
    },
    "enabledExtensions": ["jquery", "browser"],
    "transforms": [
        "minify-css",
        "minify-js",
        "resolve-css-urls"
        "./my-transform.js"
    ],
    "bundles": [
        {
            "name": "core",
            "dependencies": [
                { "require": "raptor-modules/client" },
                { "require": "raptor-templates" }
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
        "raptor-optimizer-ready-plugin"
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
     }
     else {
         return null;
     }
 }

function getProjectRootDir(dirname) {
    var rootDir = findRootDir(dirname);
    if (!rootDir) {
        throw new Error('Unable to determine project root for path "' + dirname + '"');
    }

    return rootDir;
}

function load(options, baseDir, filename) {
    ok(baseDir, '"baseDir" argument is required');
    
    if (!options || typeof options !== 'object') {
        throw new Error('Invalid options. Object expected');
    }

    if (!options.fileWriter) {
        options.fileWriter = require('./raptor-optimizer').defaultConfig.fileWriter;
    }

    var config = new Config();

    function addBundles(bundleSetName, bundles) {
        var bundleSetConfig = new BundleSetConfig(bundleSetName);
        bundles.forEach(function(bundle) {
            var bundleConfig = new BundleConfig(baseDir, filename);
            bundleConfig.name = bundle.name;

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

    propertyHandlers(options, {
        bundlingEnabled: function(value) {
            config.setBundlingEnabled(value === true);
        },
        
        fileWriter: function(writerConfig) {
            ok(writerConfig);

            config.createWriter = function() {
                var writer = new FileWriter();

                propertyHandlers(writerConfig, {
                    checksumsEnabled: function(value) {
                        writer.checksumsEnabled = value === true;
                    },

                    outputDir: function(value) {
                        value = nodePath.resolve(baseDir, value);
                        writer.outputDir = value;
                    },

                    urlPrefix: function(value) {
                        writer.urlPrefix = value;
                    },

                    includeSlotNames: function(value) {
                        writer.includeSlotNames = value === true;
                    },

                    checksumLength: function(value) {
                        writer.checksumLength = value;
                    }
                }, 'config.fileWriter');

                return writer;
            };
        },

        enabledExtensions: function(enabledExtensions) {
            config.enableExtensions(enabledExtensions);
        },

        bundles: function(bundles) {
            addBundles('default', bundles);
        },

        transforms: function(transforms) {
            transforms.forEach(function(transform) {
                if (typeof transform === 'string') {
                    if (transform.startsWith('.')) {
                        transform = require(nodePath.resolve(baseDir, transform));
                    } else {
                        transform = require(transform);
                    }
                }
                
                config.addTransform(transform);
            });
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

        cache: function(value) {
            config.cacheProvider = raptorCache.configure(value);
        },

        plugins: function(value) {
            if (value != null) {
                ok(typeof value === 'object' && !Array.isArray(value), 'Value for "plugins" expected to be an object. Actual value: ' + util.inspect(value));
                for (var pluginPath in value) {
                    if (value.hasOwnProperty(pluginPath)) {
                        var pluginConfig = value[pluginPath];
                        var resolvedPath = raptorModulesResolver.serverResolveRequire(pluginPath, baseDir);
                        var pluginFunc = require(resolvedPath);
                        ok(pluginFunc && typeof pluginFunc === 'function', 'Invalid plugin at path "' + resolvedPath + '". Plugin function not exported.');
                        config.addPlugin(pluginFunc, pluginConfig);
                    }
                }
            }
        }
    }, 'config');

    if (!config.getProjectRoot()) {
        config.setProjectRoot(getProjectRootDir(baseDir));
    }

    if (!config.cacheProvider) {
        config.cacheProvider = raptorCache.getDefaultProvider();
    }

    return config;
}



exports.load = load;

