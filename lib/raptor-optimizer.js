/**
 * The optimizer module is used to generated optimized
 * web pages--including optimized resource bundles and the HTML markup
 * to dependency the optimized resource bundles in an HTML page.
 *
 * Simple usage:
 * <js>
 * var optimizer = require('raptor/optimizer');
 * optimizer.configure('path/to/optimizer-config.xml', params);
 * var optimizedPage = optimizer.optimizePage({
 *         name: "test-page",
 *         packageManifest: 'path/to/test-page-package.json'
 *     });
 *
 * var headHtml = optimizedPage.getSlotHtml('head');
 * var bodyHtml = optimizedPage.getSlotHtml('body');
 * var loaderMeta = optimizedPage.getLoaderMetadata();
 * ...
 * </js>
 *
 * For more information, please see the <a href="http://raptorjs.org/optimizer/">Optimizer Documentation</a>.
 */

require('./combined-stream-patch').applyPatch();

require('raptor-ecma/es6');

var File = require('raptor-files').File;
var OptimizerRenderContext = require('./OptimizerRenderContext');
var CONTEXT_KEY = 'raptor-optimizer/OptimizerRenderContext';
var nodePath = require('path');
var configLoader = require('./config-loader');
var raptorPromises = require('raptor-promises');
var extensions = require('./extensions');
var transforms = require('./transforms');
var raptorPromises = require('raptor-promises');
var ok = require('assert').ok;

exports.defaultConfig = {
    fileWriter: {
        outputDir: 'static',
        includeSlotNames: false,
        checksumsEnabled: true
    }
};

function create(config, baseDir, filename) {
    if (!config) {
        config = exports.defaultConfig;
    }
    else if (typeof config === 'string') {
        filename = config;
        baseDir = nodePath.dirname(filename);
        config = JSON.parse(new File(filename).readAsString());
    }

    if (!baseDir) {
        baseDir = config.baseDir || process.cwd();
    }

    if (!config.__Config) {
        config = configLoader.load(config, baseDir, filename);
    }


    
    return raptorPromises.resolved(config)
        .then(function(config) {
            var PageOptimizer = require('./PageOptimizer');
            return new PageOptimizer(config); 
        });
}

var defaultPageOptimizer = null;

function getDefaultPageOptimizer() {
    if (!defaultPageOptimizer) {
        defaultPageOptimizer = create(exports.defaultConfig, process.cwd());
    }

    return defaultPageOptimizer;
}


function configure(config, baseDir, filename) {
    defaultPageOptimizer = create(config, baseDir, filename);
    return defaultPageOptimizer;
}

function getRenderContext(context) {
    var attributes = context.attributes;
    return attributes[CONTEXT_KEY] || 
        (attributes[CONTEXT_KEY] = new OptimizerRenderContext(context));
}

function optimizePage(pageConfig, callback) {
    
    ok(pageConfig, '"pageConfig" is required');
    ok(typeof pageConfig === 'object', '"pageConfig" should be an object');
    
    var dependencies = pageConfig.dependencies;
    var packagePath = pageConfig.packagePath;

    ok(dependencies || packagePath, '"page.dependencies" or "page.packagePath" is required');
    if (dependencies) {
        ok(typeof dependencies === 'string' || Array.isArray(dependencies), '"dependencies" should be an Array or a String');    
    }

    if (typeof dependencies === 'string') {
        packagePath = nodePath.resolve(process.cwd(), dependencies);
        dependencies = null;
    } else if (typeof packagePath === 'string') {
        packagePath = nodePath.resolve(process.cwd(), packagePath);
    }

    var promise = getDefaultPageOptimizer().then(function(pageOptimizer) {
        return pageOptimizer.optimizePage(pageConfig);
    });

    if (callback) {
        promise.then(
            function resolved(optimizedPage) {
                callback(null, optimizedPage);
            })
            .fail(function(err) {
                callback(err || 'Error while optimizing page');
            });
    }

    return promise;
}

exports.getDefaultPageOptimizer = getDefaultPageOptimizer;
exports.optimizePage = optimizePage;
exports.create = create;
exports.configure = configure;
exports.getRenderContext = getRenderContext;
exports.createExtensionSet = extensions.createExtensionSet;
exports.isExtensionSet = extensions.isExtensionSet;
exports.transforms = transforms;
exports.writers = require('./writers');

Object.defineProperty(exports, "defaultPageOptimizer", {
    get: getDefaultPageOptimizer,
    enumerable : true,
    configurable : false
});

Object.defineProperty(exports, "pageOptimizer", {
    get: function() {
        throw new Error('Property "pageOptimizer" has been removed. Use property "defaultPageOptimizer" instead.');
    },
    enumerable : true,
    configurable : false
});

exports.toString = function () {
    return '[raptor-optimizer@' + __filename + ']';
};