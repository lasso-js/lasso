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
var filters = require('./filters');
var raptorPromises = require('raptor-promises');

exports.defaultConfig = {
    fileWriter: {
        outputDir: 'build',
        urlPrefix: '/static',
        includeSlotNames: false,
        checksumsEnabled: true
    }
};

function createPageOptimizer(config, baseDir, filename) {
    if (!config) {
        config = exports.defaultConfig;
    }
    else if (typeof config === 'string') {
        filename = config;
        baseDir = nodePath.dirname(filename);
        config = JSON.parse(new File(filename).readAsString());
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
        defaultPageOptimizer = createPageOptimizer(exports.defaultConfig, process.cwd());
    }

    return defaultPageOptimizer;
}

/**
 * Optimizes a page based on the page options provided.
 *
 * Supported options:
 * <ul>
 *     <li><b>name</b> {String}: The name of the page. This property is used to determine the name for page bundles and it is also used for any page-specific configuration options. [REQUIRED]
 *     <li><b>basePath</b> {String}: A directory name used to generate relative URLs to resource bundles. The base path will typically be the output directory for the page. This option is ignored if the optimizer is configured to use a URL prefix.
 *     <li><b>enabledExtensions</b> {Array|Object|{@link raptor/packaging/PackageExtension}}: A collection of extensions that should be enabled when generating the optimized page bundles
 *     <li><b>packageManifest</b> {{@link raptor/packaging/PackageManifest}|{@link raptor/resources/Resource}|{@link raptor/files/File}|String}: A package manifest for the page that describes the page dependencies
 * </ul>
 *
 * @param  {options} options Information about the page being optimized (see above for supported options)
 * @return {raptor/optimizer/OptimizedPage} The object that represents the optimized page.
 */
function optimizePage(options) {
    return getDefaultPageOptimizer().then(function(pageOptimizer) {
        return pageOptimizer.optimizePage(options);
    });
}

/**
 * Creates a new instance of a page optimizer using the provided configuration and params.
 *
 * @param config {raptor/optimizer/Config|String|raptor/files/File|raptor/resources/Resource} config The configuration to use
 * @returns {raptor/optimizer/PageOptimizer} A new instance of a configured page optimizer
 */


/**
 * Configures the default page optimizer instance using the provided
 * configuration and configuration params.
 *
 * @param  {raptor/optimizer/Config|String|raptor/files/File|raptor/resources/Resource} config The configuration to use
 * @param  {Object} params An object with name/value pairs that are used for variable substitutions in the XML configuration file. If a {@link optimimizer.Config} object is provided then this parameter is ignored.
 * @return {void}
 */
function create(config, baseDir, filename) {
    return createPageOptimizer(config, baseDir, filename);
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

exports.getDefaultPageOptimizer = getDefaultPageOptimizer;
exports.optimizePage = optimizePage;
exports.create = create;
exports.configure = configure;
exports.createPageOptimizer = createPageOptimizer;
exports.getRenderContext = getRenderContext;
exports.createExtensionSet = extensions.createExtensionSet;
exports.isExtensionSet = extensions.isExtensionSet;
exports.filters = filters;

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