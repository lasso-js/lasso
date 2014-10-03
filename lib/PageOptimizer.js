var nodePath = require('path');
var OptimizerCache = require('./OptimizerCache');
var OptimizedPage = require('./OptimizedPage');
var OptimizerContext = require('./OptimizerContext');
var SlotTracker = require('./SlotTracker');
var escapeXmlAttr = require('raptor-util/escapeXml').attr;
var logger = require('raptor-logging').logger(module);
var EventEmitter = require('events').EventEmitter;
var mime = require('mime');
var raptorUtil = require('raptor-util');
var pageBundlesBuilder = require('./page-bundles-builder');
var BundleMappings = require('./BundleMappings');
var manifestLoader = require('./manifest-loader');
var OptimizerManifest = require('./OptimizerManifest');
var extensions = require('./extensions');
var dependencies = require('./dependencies');
var fs = require('fs');
var commaSeparatedRegExp = /\s*,\s*/;
var ok = require('assert').ok;
var bundleBuilder = require('./bundle-builder');
var isAbsolute = require('./path').isAbsolute;
var createWriter = require('./writers').createWriter;
var raptorModulesUtil = require('raptor-modules/util');
var perfLogger = require('raptor-logging').logger('optimizer/perf');
var extend = require('raptor-util/extend');
var cachingFs = require('./caching-fs');
var createError = require('raptor-util/createError');
var series = require('raptor-async/series');
var raptorPromises = require('raptor-promises');

function getOptimizerManifestFromOptions(options, dependencyRegistry, callback) {
    var optimizerManifest;
    var from = options.from;
    var fromFilename;
    var fromDirname;

    if (from) {
        if (typeof from === 'object') {
            if (!from.filename) {
                throw new Error('Invalid "from" object.');
            }
            fromFilename = from.filename;
            fromDirname = nodePath.dirname(fromFilename);
        }
        else if (typeof from === 'string') {

            var stat = cachingFs.statSync(from);
            if (!stat.exists()) {
                throw new Error('No directory exists at given "from" path ("' + from + '")');
            }

            if (stat.isDirectory()) {
                fromDirname = from;
            } else {
                fromFilename = from;
                fromDirname = nodePath.dirname(from);
            }
        }
    }

    var optimizerManifestOptions;

    if (options.packagePath) {
        var packagePath = options.packagePath;

        if (typeof packagePath !== 'string') {
            return callback(new Error('"packagePath" option should be a string'));
        }

        if (!fromDirname) {
            fromDirname = nodePath.dirname(packagePath);
        }

        optimizerManifest = manifestLoader.load(packagePath, fromDirname);
        if (optimizerManifest) {
            optimizerManifestOptions = {
                manifest: optimizerManifest,
                dependencyRegistry: dependencyRegistry,
                dirname: optimizerManifest.dirname,
                filename: optimizerManifest.filename
            };
        }
    } else if (options.dependencies) {
        var dependencies = options.dependencies;

        if (!fromDirname) {
            fromDirname = process.cwd();
        }

        if (typeof dependencies === 'function') {
            dependencies(function(err, dependencies) {
                if (err) {
                    return callback(err);
                }

                callback(null, new OptimizerManifest({
                        manifest: {
                            dependencies: dependencies
                        },
                        dependencyRegistry: dependencyRegistry,
                        dirname: fromDirname,
                        filename: fromFilename
                    }));
            });
            return;
        } else if (!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }

        optimizerManifestOptions = {
            manifest: {
                dependencies: dependencies
            },
            dependencyRegistry: dependencyRegistry,
            dirname: fromDirname,
            filename: fromFilename
        };

    } else if (options.optimizerManifest) {
        optimizerManifestOptions = {
            manifest: options.optimizerManifest,
            dependencyRegistry: dependencyRegistry,
            dirname: options.optimizerManifest.dirname || process.cwd(),
            filename: options.optimizerManifest.filename
        };

    } else if (options.packagePaths) {
        optimizerManifestOptions = {
            manifest: {
                dependencies: options.packagePaths
            },
            dependencyRegistry: dependencyRegistry,
            dirname: process.cwd(),
            filename: undefined
        };
    }

    if (optimizerManifestOptions) {
        callback(null, new OptimizerManifest(optimizerManifestOptions));
    } else {
        callback(null, null);
    }
}

function doOptimizePage(pageOptimizer, options, callback) {
    var logInfoEnabled = logger.isInfoEnabled();
    var perfLogInfoEnabled = perfLogger.isInfoEnabled();

    var startTime = Date.now();
    // if we create a new context then make sure we put it
    // back into the options object for reference later
    var optimizerContext = options.optimizerContext || pageOptimizer.createOptimizerContext(options);
    var pageName = optimizerContext.pageName = options.pageName || options.name;

    var config = pageOptimizer.config;
    getOptimizerManifestFromOptions(options, pageOptimizer.dependencies, function(err, optimizerManifest) {
        if (!optimizerManifest) {
            callback(new Error('Invalid options. "dependencies", "packagePath" or "optimizerManifest" expected. Options: ' + require('util').inspect(options)));
        }

        options.optimizerManifest = optimizerManifest;

        var pluginContext = {
            context: optimizerContext,
            config: config,
            options: options,
            pageOptimizer: pageOptimizer
        };

        pageOptimizer.emit('beforeOptimizePage', pluginContext);

        var optimizedPage = new OptimizedPage();
        var slotTracker = new SlotTracker();

        var writer = optimizerContext.writer;

        function registerBundle(bundle, async) {

            if (!async) {
                optimizedPage.addUrl(bundle.getUrl(optimizerContext), bundle.getSlot(), bundle.getContentType());

                if (!bundle.isExternalResource && bundle.outputFile) {
                    optimizedPage.addFile(bundle.outputFile, bundle.getContentType());
                }
            }
            else {
                // TODO: Should we track URLs and files for async-only bundles?
            }
        }

        function onBundleWritten(bundle) {
            if (logInfoEnabled) {
                logger.info('Bundle ' + bundle + ' written.');
            }
            registerBundle(bundle, false);
        }

        function onAsyncBundleWritten(bundle) {
            if (logInfoEnabled) {
                logger.info('Bundle ' + bundle + ' (async) written.');
            }
            registerBundle(bundle, true);
        }

        function buildHtmlSlots(pageBundles) {
            pageBundles.forEachBundle(function(bundle) {
                var html,
                    url;

                if (bundle.isInline()) {
                    slotTracker.addInlineCode(bundle.getSlot(), bundle.getContentType(), bundle.getCode(), bundle.getInlinePos(), bundle.isMergeInline());
                } else {
                    url = bundle.getUrl(optimizerContext);

                    if (bundle.isJavaScript()) {
                        html = pageOptimizer.getJavaScriptDependencyHtml(url);
                    } else if (bundle.isStyleSheet()) {
                        html = pageOptimizer.getCSSDependencyHtml(url);
                    } else if (!bundle.hasContent()) {
                        // ignore this bundle because contentType is "none"
                        return;
                    } else {
                        throw new Error('Invalid bundle content type: ' + bundle.getContentType());
                    }
                    slotTracker.addContent(bundle.getSlot(), bundle.getContentType(), html);
                }
            });

            optimizedPage.setHtmlBySlot(slotTracker.getHtmlBySlot());
        }

        var pageBundles;

        var prevStartTime = startTime;

        var asyncTasks = [
            function buildPageBundles(callback) {
                pageOptimizer.buildPageBundles(options, optimizerContext, function(err, _pageBundles) {
                    if (err) {
                        return callback(err);
                    }

                    pageBundles = _pageBundles;
                    callback();
                });
            },
            function writeAsyncBundles(callback) {
                if (perfLogInfoEnabled) {
                    perfLogger.info('Page bundles built in ' + (Date.now() - prevStartTime) + 'ms');
                }
                prevStartTime = Date.now();

                optimizerContext.setPhase('write-async-page-bundles');

                // First write out all of the async bundles
                writer.writeBundles(pageBundles.forEachAsyncBundleIter(), onAsyncBundleWritten, optimizerContext, callback);
            },
            function writeSyncBundles(callback) {
                if (perfLogInfoEnabled) {
                    perfLogger.info('Async page bundles written in ' + (Date.now() - prevStartTime) + 'ms');
                }
                prevStartTime = Date.now();

                optimizerContext.setPhase('write-page-bundles');


                // Now write out all of the non-async bundles
                writer.writeBundles(pageBundles.forEachBundleIter(), onBundleWritten, optimizerContext, callback);
            }
        ];

        series(asyncTasks, function(err) {
            if (err) {
                return callback(err);
            }

            if (perfLogInfoEnabled) {
                perfLogger.info('Page bundles written in ' + (Date.now() - prevStartTime) + 'ms');
            }
            // All of the bundles have now been persisted, now we can
            // generate all of the HTML for the page
            buildHtmlSlots(pageBundles);

            perfLogger.info('Optimized page "' + pageName + '" in ' + (Date.now() - startTime) + 'ms');

            if (optimizerContext.cache) {
                optimizerContext.cache.flushAll();
            }

            callback(null, optimizedPage);
        });
    });
}

function PageOptimizer(config) {
    ok(config, 'config is required');

    PageOptimizer.$super.call(this);

    this.config = config;

    // OptimizerCache instances cache information associated with a specific
    this.optimizerCacheLookup = {};

    this.dependencies = dependencies.createRegistry();

    this.initPlugins();

    var writer = this.writer;
    if (!writer) {
        if (!config.writer) {
            throw new Error('Writer not configured for page optimizer config');
        }

        writer = createWriter(config.writer);

        writer.pageOptimizer = this;
        writer.config = this.config;
    }

    this.writer = writer;

    this.emit('pageOptimizerConfigured', {
        config: this.config,
        pageOptimizer: this
    });
}

PageOptimizer.prototype = {

    initPlugins: function() {
        var plugins = this.config.getPlugins();
        for (var i=0; i<plugins.length; i++) {
            var plugin = plugins[i];
            plugin.func(this, plugin.config || {});
        }
    },

    createAppBundleMappings: function(bundleSetConfig, optimizerContext, callback) {
        ok(bundleSetConfig, '"bundleSetConfig" is required');
        ok(typeof callback === 'function', 'callback function is required');

        var dependencyRegistry = this.dependencies;
        var bundleMappings = new BundleMappings(this.config, optimizerContext);

        var asyncTasks = [];

        optimizerContext.setPhase('app-bundle-mappings');

        bundleSetConfig.forEachBundleConfig(function(bundleConfig) {
            var bundleName = bundleConfig.name;

            ok(bundleName, 'Illegal state. Bundle name is required');

            asyncTasks.push(function(callback) {
                bundleBuilder.buildBundle(
                    bundleMappings,
                    dependencyRegistry,
                    bundleConfig,
                    optimizerContext,
                    callback);
            });
        });

        return series(asyncTasks, function(err) {
            if (err) {
                return callback(err);
            }

            return callback(null, bundleMappings);
        });
    },

    buildPageBundles: function(options, optimizerContext, callback) {
        ok(typeof callback === 'function', 'callback function is required');
        var pageName = options.pageName;

        var config = this.getConfig();
        var bundleSetConfig = config.getPageBundleSetConfig(pageName);

        var _this = this;

        var startTime = Date.now();

        function buildPageBundleMappings(err, appBundleMappings) {
            if (err) {
                return callback(err);
            }

            var bundleMappings = new BundleMappings(config, optimizerContext);

            if (appBundleMappings) {
                bundleMappings.setParentBundleMappings(appBundleMappings);
            }

            if (perfLogger.isInfoEnabled()) {
                perfLogger.debug('Bundle mappings built in ' + (Date.now() - startTime) + 'ms');
            }

            pageBundlesBuilder.build(options, config, bundleMappings, optimizerContext, callback);
        }

        if (config.isBundlingEnabled()) {
            _this.getAppBundleMappingsCached(bundleSetConfig, optimizerContext, buildPageBundleMappings);
        } else{
            buildPageBundleMappings();
        }
    },

    getAppBundleMappingsCached: function(bundleSetConfig, optimizerContext, callback) {
        var optimizerCache = this.getOptimizerCache(optimizerContext);
        var cacheKey = bundleSetConfig._id;
        var _this = this;

        var builder = function(callback) {
            _this.createAppBundleMappings(bundleSetConfig, optimizerContext, callback);
        };

        optimizerCache.getBundleMappings(cacheKey, builder, callback);
    },

    buildOptimizerCacheKey: function(optimizerContext) {

        //var config = this.getConfig();

        var cacheKey = '';

        function cacheKey_add(str) {
            if (cacheKey.length > 0) {
                cacheKey += '-';
            }

            cacheKey += str;
        }

        //cacheKey_add()

        this.emit('buildCacheKey', {
            context: optimizerContext,
            config: this.config,
            pageOptimizer: this,
            cacheKey: {
                add: cacheKey_add
            }
        });

        var enabledExtensions = optimizerContext.enabledExtensions;
        if (enabledExtensions) {
            cacheKey_add(enabledExtensions.getKey());
        }

        return cacheKey;
    },

    /**
     * This method is used by the optimizer page tag to
     * @param {Object} options is an object with the following properties:
     *    - page: the render context
     *    - enabledExtensions: an array of enabled extensions
     * @return {OptimizerCache} the optimizer cache associated with this page optimizer
     */
    getOptimizerCache: function(optimizerContext) {
        var cache = optimizerContext.cache;
        var config = this.getConfig();

        if (!cache) {
            var key = this.buildOptimizerCacheKey(optimizerContext);
            cache = this.optimizerCacheLookup[key];
            if (!cache) {
                cache = this.optimizerCacheLookup[key] = new OptimizerCache(key, {
                        dir: config.getCacheDir(),
                        profile: config.getCacheProfile(),
                        profiles: config.getCacheProfiles()
                    });

                var pluginContext = {
                    context: optimizerContext,
                    config: config,
                    options: optimizerContext.options,
                    pageOptimizer: this,
                    cacheKey: key,
                    optimizerCache: cache,
                };

                this.emit('optimizerCacheCreated', pluginContext);
            }

            optimizerContext.cache = cache;
        }
        return cache;
    },

    getConfig: function() {
        return this.config;
    },

    getJavaScriptDependencyHtml: function(url) {
        return '<script type="text/javascript" src="' + escapeXmlAttr(url) + '"></script>';
    },

    getCSSDependencyHtml: function(url) {
        return '<link rel="stylesheet" type="text/css" href="' + escapeXmlAttr(url) + '">';
    },

    resolveEnabledExtensions: function(optimizerRenderContext, options) {
        var enabledExtensions = extensions.createExtensionSet();

        if (options) {
            var additionalExtensions = options.enabledExtensions || options.extensions;
            if (additionalExtensions) {
                if (typeof additionalExtensions === 'string') {
                    additionalExtensions = additionalExtensions.split(commaSeparatedRegExp);
                }
                enabledExtensions.addAll(additionalExtensions);
            }
        }

        if (optimizerRenderContext) {
            var contextEnabledExtensions = optimizerRenderContext.getEnabledExtensions();
            if (contextEnabledExtensions) {
                enabledExtensions.addAll(contextEnabledExtensions);
            }
        }

        enabledExtensions.addAll(this.config.getEnabledExtensions());

        //TODO: Automatically add page-level enabled extensions

        return enabledExtensions;
    },

    optimizePage: function(options, callback) {
        var _this = this;

        var deferred;

        if (!callback) {
            deferred = raptorPromises.defer();
        }

        function done(e, optimizedPage) {
            if (e) {
                if (deferred) {
                    deferred.reject(e);
                }
                if (callback) {
                    callback(e);
                }
                return;
            }

            if (deferred) {
                deferred.resolve(optimizedPage);
            }

            if (callback) {
                callback(null, optimizedPage);
            }
        }

        if (options.cache !== false) {
            var optimizerContext = this.createOptimizerContext(options);
            var optimizerCache = this.getOptimizerCache(optimizerContext);
            var cacheKey = options.cacheKey || options.pageName || options.name;

            optimizerCache.getOptimizedPage(
                cacheKey,
                {
                    builder: function(callback) {
                        options = extend({}, options);
                        // Resuse the same optimizer context
                        options.optimizerContext = optimizerContext;
                        doOptimizePage(_this, options, callback);
                    }
                },
                done);


        } else {
            doOptimizePage(_this, options, done);
        }

        if (!callback) {
            return deferred.promise;
        }
    },

    /**
     * A OptimizerContext is created for each call to PageOptimizer::optimizePage
     * The OptimizerContext contains the following:
     * - enabledExtensions: Complete list of enabled extensions
     * - writer: A reference to the write configured by the PageOptimizer
     * - optimizer: A reference to the PageOptimizer
     * - cache: The OptimizerC
     */
    createOptimizerContext: function(options) {
        var writer = this.writer;
        var optimizerContext = new OptimizerContext();

        options = options || {};

        if (options.basePath) {
            optimizerContext.basePath = options.basePath;
        }

        if (options.data) {
            raptorUtil.extend(optimizerContext.data, options.data);
            delete options.data;
        }

        optimizerContext.dependencyRegistry = this.dependencies;
        optimizerContext.enabledExtensions = options.enabledExtensions;
        optimizerContext.config = this.config;
        optimizerContext.writer = writer;
        optimizerContext.optimizer = this;
        optimizerContext.cache = this.getOptimizerCache(optimizerContext);
        optimizerContext.options = options;

        return optimizerContext;
    },

    optimizeResourceCached: function(path, optimizerContext, callback) {

        if (typeof optimizerContext === 'function') {
            callback = arguments[1];
            optimizerContext = null;
        }

        if (!optimizerContext) {
            optimizerContext = this.createOptimizerContext(optimizerContext);
        }

        var cache = this.getOptimizerCache(optimizerContext);
        var _this = this;
        var cacheKey = path;

        if (optimizerContext.basePath) {
            cacheKey += '|' + optimizerContext.basePath;
        }

        cache.getOptimizedResource(
            cacheKey,
            function(callback) {
                _this.optimizeResource(path, optimizerContext, callback);
            },
            callback);
    },

    /**
     * Supported properties for the context argument:
     * <ul>
     *     <li>inPlaceFromDir: Directory for calculating relative paths for in-place deployment (if enabled, optional)
     *     <li>relativeFromDir: Directory for calculating relative path for final URL (optional)
     * </ul>
     *
     * @param  {String} path The resource path to resolve to a URL
     * @param  {Object} context Additional contextual information
     * @return {Promise} The promise that will eventually resolve to the URL
     */
    optimizeResource: function(path, optimizerContext, callback) {
        if (typeof optimizerContext === 'function') {
            callback = optimizerContext;
            optimizerContext = null;
        }

        ok(callback != null, 'callback is required');
        ok(typeof callback === 'function', 'callback should be a function');

        var inputPath = path;

        function done(err, result) {
            if (err) {
                err = createError('Error while resolving resource URL for path "' + path + '". Error: ' + err, err);
                return callback(err);
            }

            var url = result.url;

            if (logger.isDebugEnabled()) {
                logger.debug('Resolved URL: ', inputPath, ' --> ', url);
            }

            return callback(null, result);
        }

        if (path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('//')) {

            return done(null, {
                url: path
            });
        } else {
            if (!optimizerContext) {
                // FIXME: WHY IS IT NECESSARY TO CREATE CONTEXT ON THE FLY???
                // -phil
                optimizerContext = this.createOptimizerContext(optimizerContext);
            }

            if (!isAbsolute(path)) {
                var from;
                if (optimizerContext.dependency) {
                    from = optimizerContext.dependency.getDir(optimizerContext);
                } else {
                    from = raptorModulesUtil.getProjectRootDir(path);
                }
                path = nodePath.join(from, path);
            }

            var writer = this.writer;



            var hashString = '';
            var hashStart = path.indexOf('#');

            if (hashStart != -1) {
                hashString = path.substring(hashStart);
                path = path.substring(0, hashStart);
            }

            var queryString = '',
                queryStart = path.indexOf('?');

            if (queryStart != -1) {
                queryString = path.substring(queryStart);
                path = path.substring(0, queryStart);
            }

            if (!cachingFs.existsSync(path)) {
                return done(new Error('File with path "' + path + '" does not exist'));
            }

            var base64Encode = queryString === '?base64';

            // We only do the Base64 encoding if the writer prefers not
            // to do the Base64 encoding or does not support Base64 encoding
            if (base64Encode && writer.base64EncodeSupported !== true) {
                fs.readFile(path, null, function(err, data) {
                    if (err) {
                        return done(err);
                    }

                    var dataUrl = 'data:' + mime.lookup(path) + ';base64,' + data.toString('base64');
                    return done(null, {
                        url: dataUrl
                    });
                });
            }
            else {
                // Record that base 64 encoding was requested for this resource (this might be helpful to the writer)
                if (base64Encode) {
                    optimizerContext = Object.create(optimizerContext);
                    optimizerContext.base64EncodeUrl = base64Encode;
                }

                writer.writeResource(path, optimizerContext, done);
            }
        }
    },

    addTransform: function(transform) {
        this.config.addTransform(transform);
    }
};

raptorUtil.inherit(PageOptimizer, EventEmitter);

module.exports = PageOptimizer;
