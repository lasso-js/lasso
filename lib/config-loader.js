var Config = require('./Config');
var BundleSetConfig = require('./BundleSetConfig');
var BundleConfig = require('./BundleConfig');
var nodePath = require('path');

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

    var handlers = {
        outputDir: function(outputDir) {
            config.setOutputDir(nodePath.resolve(baseDir, outputDir));
        },

        enabledExtensions: function(enabledExtensions) {
            config.enableExtensions(enabledExtensions);
        },

        checksumsEnabled: function(checksumsEnabled) {
            config.setChecksumsEnabled(checksumsEnabled);
        },

        bundles: function(bundles) {
            addBundles('default', bundles);
        },

        urlPrefix: function(urlPrefix) {
            config.setUrlPrefix(urlPrefix);
        },

        includeBundleSlotNames: function(includeBundleSlotNames) {
            config.includeBundleSlotNames = includeBundleSlotNames === true;
        },

        filters: function(filters) {
            filters.forEach(function(filter) {
                if (typeof filter === 'string') {
                    filter = require('./filters').get(filter);
                }
                
                config.addFilter(filter);
            });
        },

        inPlaceDeploymentEnabled: function(inPlaceDeploymentEnabled) {
            config.setInPlaceDeploymentEnabled(inPlaceDeploymentEnabled);
        }
    };

    for (var k in options) {
        if (options.hasOwnProperty(k)) {
            var handler = handlers[k];
            if (!handler) {
                throw new Error('Invalid option: ' + k);
            }
            handler(options[k]);
        }
    }

    return config;

}



exports.load = load;

