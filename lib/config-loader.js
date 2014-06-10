var Config = require('./Config');
var BundleSetConfig = require('./BundleSetConfig');
var BundleConfig = require('./BundleConfig');
var nodePath = require('path');
var fileWriterFactory = require('./writers/file-writer');
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
        "raptor-optimizer-minify-css",
        "raptor-optimizer-minify-js",
        "raptor-optimizer-resolve-css-urls"
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

    if (!options.fileWriter) {
        options.fileWriter = require('./raptor-optimizer').defaultFileWriterConfig;
    }
    var transforms = options.transforms || (options.transforms = []);

    if (options.minify) {
        transforms.push('raptor-optimizer-minify-js');
        transforms.push('raptor-optimizer-minify-css');
    } else {
        if (options.minifyJS) {
            transforms.push('raptor-optimizer-minify-js');
        }
        if (options.minifyCSS) {
            transforms.push('raptor-optimizer-minify-css');
        }
    }

    delete options.minify;
    delete options.minifyJS;
    delete options.minifyCSS;

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

            var fileWriterConfig = {};

            propertyHandlers(writerConfig, {
                checksumsEnabled: function(value) {
                    fileWriterConfig.checksumsEnabled = value === true;
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

                checksumLength: function(value) {
                    fileWriterConfig.checksumLength = value;
                }
            }, 'config.fileWriter');

            config.writer = fileWriterFactory(fileWriterConfig, config);
        },

        enabledExtensions: function(enabledExtensions) {
            config.enableExtensions(enabledExtensions);
        },

        bundles: function(bundles) {
            if (bundles) {
                addBundles('default', bundles);
            }
        },

        transforms: function(transforms) {
            transforms.forEach(function(transform) {
                if (typeof transform === 'string') {
                    var transformPath = transform;
                    var resolvedPath;
                    try {
                        resolvedPath = raptorModulesResolver.serverResolveRequire(transformPath, baseDir);
                    } catch(e) {
                        try {
                            resolvedPath = raptorModulesResolver.serverResolveRequire(transformPath, __dirname);
                        } catch(e2) {
                            throw new Error('Plugin module not found for "' + transformPath + '". Searched from "' + baseDir + '"');
                        }
                        
                    }

                    transform = require(resolvedPath);
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
                        var pluginConfig = value[pluginPath] || {};

                        if (pluginConfig.enabled === false) {
                            continue;
                        }
                        
                        var resolvedPath;
                        try {
                            resolvedPath = raptorModulesResolver.serverResolveRequire(pluginPath, baseDir);
                        } catch(e) {
                            try {
                                resolvedPath = raptorModulesResolver.serverResolveRequire(pluginPath, __dirname);
                            } catch(e2) {
                                throw new Error('Plugin module not found for "' + pluginPath + '". Searched from "' + baseDir + '"');
                            }
                            
                        }
                        
                        var pluginFunc = require(resolvedPath);
                        ok(pluginFunc && typeof pluginFunc === 'function', 'Invalid plugin at path "' + resolvedPath + '". Plugin function not exported.');
                        config.addPlugin(pluginFunc, pluginConfig);
                    }
                }
            }
        },

        pages: function(value) {
            if (value) {
                for (var pageName in value) {
                    if (value.hasOwnProperty(pageName)) {
                        var pageConfig = value[pageName];

                        var page = { name: pageName, from: baseDir };


                        propertyHandlers(pageConfig, {
                            dependencies: function(value) {
                                page.dependencies = value;
                            }
                        }, 'config.pages.' + pageName);

                        config.addPage(page);
                    }
                }
            }
        },

        projectRoot: function(value) {
            config.setProjectRoot(nodePath.resolve(baseDir, value));
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

