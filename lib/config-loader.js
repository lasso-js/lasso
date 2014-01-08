var Config = require('./Config');
var BundleSetConfig = require('./BundleSetConfig');
var BundleConfig = require('./BundleConfig');
var nodePath = require('path');
var FileWriter = require('./writers/FileWriter');
var forEachEntry = require('raptor-util').forEachEntry;
var fs = require('fs');

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
    "filters": [
        "minify-css",
        "minify-js",
        "resolve-css-urls"
        "./my-filter.js"
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
    if (!options || typeof options !== 'object') {
        throw new Error('Invalid options. Object expected');
    }

    var config = new Config();

    function addBundles(bundleSetName, bundles) {
        var bundleSetConfig = new BundleSetConfig(bundleSetName);
        bundles.forEach(function(bundle) {
            var bundleConfig = new BundleConfig(baseDir, filename);
            bundleConfig.name = bundle.name;
            bundleConfig.addDependencies(bundle.dependencies);
            bundleSetConfig.addBundleConfig(bundleConfig);
        });
        config.addBundleSetConfig(bundleSetConfig);
    }

    function invokeHandlers(config, handlers, path) {
        if (!config) {
            throw new Error('"config" argument is required');
        }

        if (typeof config !== 'object') {
            throw new Error('Object expected for ' + path);
        }

        for (var k in config) {
            if (config.hasOwnProperty(k)) {
                var handler = handlers[k];
                if (!handler) {
                    throw new Error('Invalid option of "' + k + '" for ' + path + '. Allowed: ' + Object.keys(handlers).join(', '));
                }
                try {
                    handler(config[k]);    
                }
                catch(e) {
                    if (!e.invokeHandlerError) {
                        var e = new Error('Error while applying option of "' + k + '" for ' + path + '. Exception: ' + (e.stack || e));
                        e.invokeHandlerError = e;
                        throw e;
                    }
                    else {
                        throw e;
                    }
                    
                }
                
            }
        }
    }

    function validateConfig(config) {
        for (var k in config) {
            if (config.hasOwnProperty(k) && !allowedSet[k]) {
                throw new Error('Invalid property of "' + k + '"');
            }
        }
    }

    invokeHandlers(options, {
        fileWriter: function(writerConfig) {
            config.createWriter = function(writerConfig) {
                var writer = new FileWriter();

                invokeHandlers(writerConfig, {
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

        filters: function(filters) {
            filters.forEach(function(filter) {
                if (typeof filter === 'string') {
                    if (filter.startsWith('.')) {
                        filter = require(nodePath.resolve(baseDir, filter));
                    }
                    else {
                        filter = require('./filters').get(filter);    
                    }
                }
                
                config.addFilter(filter);
            });
        },

        inPlaceDeployment: function(inPlaceDeploymentOptions) {
            invokeHandlers(inPlaceDeploymentOptions, {
                enabled: function(value) {
                    config.setInPlaceDeploymentEnabled(value === true);        
                },

                urlPrefix: function(value) {
                    config.setInPlaceDeploymentUrlPrefix(value);
                }
            }, 'config.inPlaceDeployment');
        }
    }, 'config');

    if (!config.getProjectRoot()) {
        config.setProjectRoot(getProjectRootDir(baseDir));
    }

    return config;
}



exports.load = load;

