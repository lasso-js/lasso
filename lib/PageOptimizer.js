var nodePath = require('path');
var raptorPromises = require('raptor-promises');
var OptimizerCache = require('./OptimizerCache');
var OptimizedPage = require('./OptimizedPage');
var OptimizerContext = require('./OptimizerContext');
var SlotTracker = require('./SlotTracker');
var promises = require('raptor-promises');
var escapeXmlAttr = require('raptor-xml/util').escapeXmlAttr;
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
var perfLogger = require('raptor-logging').logger('raptor-optimizer/perf');

function getOptimizerManifestFromOptions(options, dependencyRegistry) {
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
            var fromStat = fs.statSync(from);
            if (fromStat.isDirectory()) {
                fromDirname = from;
            }
            else {
                fromFilename = from;
                fromDirname = nodePath.dirname(from);
            }
        }
    }

    var optimizerManifestOptions;

    if (options.packagePath) {
        var packagePath = options.packagePath;
        if (typeof packagePath !== 'string') {
            throw new Error('"packagePath" option should be a string');
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

    if (!optimizerManifestOptions) {
        return null;
    }

    return new OptimizerManifest(optimizerManifestOptions);
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
        this.loadDefaultPlugins();

        var plugins = this.config.plugins;
        for (var i=0; i<plugins.length; i++) {
            var plugin = plugins[i];
            plugin.func(this, plugin.config || {});
        }
    },

    loadDefaultPlugins: function() {
        require('raptor-optimizer-require')(this, {});
        require('raptor-optimizer-rhtml')(this, {});
        require('raptor-optimizer-less')(this, {});
        require('raptor-optimizer-dust')(this, {});
    },

    createBundleMappings: function(bundleSetConfig, optimizerContext) {

        if (!bundleSetConfig) {
            throw new Error('"bundleSetConfig" is required');
        }

        var dependencyRegistry = this.dependencies;
        var bundleMappings = new BundleMappings(this.config, optimizerContext);
        var promiseChain = promises.resolved();

        bundleSetConfig.forEachBundleConfig(function(bundleConfig) {
            promiseChain = promiseChain.then(function() {
                var bundleName = bundleConfig.name;

                if (!bundleName) {
                    throw new Error('Illegal state. Bundle name is required');
                }

                return bundleBuilder.buildBundle(
                    bundleMappings,
                    dependencyRegistry,
                    bundleConfig,
                    optimizerContext);
            });
        });

        return promiseChain
            .then(function() {
                return bundleMappings;
            });
    },

    buildPageBundles: function(options, optimizerContext) {
        var pageName = options.pageName;

        var config = this.getConfig();
        var bundleSetConfig = config.getPageBundleSetConfig(pageName);
        
        var _this = this;

        var deferred = promises.defer();

        function onParentBundleMappings(err, parentBundleMappings) {
            if (err) {
                return deferred.reject(err);
            }

            var bundleMappings = new BundleMappings(config, optimizerContext);
            if (parentBundleMappings) {
                bundleMappings.setParentBundleMappings(parentBundleMappings);
            }

            deferred.resolve(bundleMappings);
        }
        if (config.isBundlingEnabled()) {
            _this.getBundleMappingsCached(bundleSetConfig, optimizerContext, onParentBundleMappings);
        } else{
            onParentBundleMappings();
        }

        var startTime = Date.now();
        return deferred.promise.then(function(bundleMappings) {
                logger.debug('Bundle mappings built in ' + (Date.now() - startTime) + 'ms');
                return pageBundlesBuilder.build(options, config, bundleMappings, optimizerContext);
            });
    },

    getBundleMappingsCached: function(bundleSetConfig, optimizerContext, callback) {
        var optimizerCache = this.getOptimizerCache(optimizerContext);
        var cacheKey = bundleSetConfig._id;
        var _this = this;

        var builder = function(callback) {
            _this.createBundleMappings(bundleSetConfig, optimizerContext)
                .then(function(bundleMappings) {
                    callback(null, bundleMappings);
                })
                .catch(callback);
        };

        optimizerCache.getBundleMappings(cacheKey, builder, callback);
    },

    buildOptimizerCacheKey: function(options) {

        //var config = this.getConfig();

        var cacheKey = '';

        function cacheKey_add(str) {
            if (cacheKey.length > 0) {
                cacheKey += '__';
            }

            cacheKey += str;
        }

        //cacheKey_add()

        // FIXME: What is this for
        // Comment out following lines because I don't think we need them.
        // - phil
        // this.emit('buildCacheKey', {
        //     context: context,
        //     config: config,
        //     pageOptimizer: this,
        //     cacheKey: {
        //         add: cacheKey_add
        //     }
        // });

        var enabledExtensions = options.enabledExtensions;
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
        if (!cache) {
            var key = this.buildOptimizerCacheKey(optimizerContext);
            cache = optimizerContext.cache = this.optimizerCacheLookup[key] || (this.optimizerCacheLookup[key] = new OptimizerCache(key));
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
        var startTime = Date.now();
        // if we create a new context then make sure we put it
        // back into the options object for reference later
        var optimizerContext = this.createOptimizerContext(options);

        var config = this.config;
        var optimizerManifest = getOptimizerManifestFromOptions(options, this.dependencies);
        if (!optimizerManifest) {
            throw new Error('Invalid options. "dependencies", "packagePath" or "optimizerManifest" expected. Options: ' + require('util').inspect(options));
        }

        options.optimizerManifest = optimizerManifest;

        var pluginContext = {
            context: optimizerContext,
            config: config,
            options: options,
            pageOptimizer: this
        };

        this.emit('beforeOptimizePage', pluginContext);

        var optimizedPage = new OptimizedPage();
        var slotTracker = new SlotTracker();
        var _this = this;

        
        optimizedPage.context = optimizerContext;
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
            logger.info('Bundle ' + bundle.name + ' written.');
            registerBundle(bundle, false);
        }

        function onAsyncBundleWritten(bundle) {
            logger.info('Bundle ' + bundle.name + ' (async) written.');
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
                        html = _this.getJavaScriptDependencyHtml(url);
                    } else if (bundle.isStyleSheet()) {
                        html = _this.getCSSDependencyHtml(url);
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
        var promise = this.buildPageBundles(options, optimizerContext)
            .then(function(_pageBundles) {
                if (perfLogger.isInfoEnabled()) {
                    perfLogger.info('Page bundles built in ' + (Date.now() - prevStartTime) + 'ms');
                }
                pageBundles = _pageBundles;
                prevStartTime = Date.now();
                // First write out all of the async bundles
                return writer.writeBundles(pageBundles.forEachAsyncBundleIter(), onAsyncBundleWritten);
            })
            .then(function() {
                if (perfLogger.isInfoEnabled()) {
                    perfLogger.info('Async page bundles written in ' + (Date.now() - prevStartTime) + 'ms');
                }
                prevStartTime = Date.now();
                // Now write out all of the non-async bundles
                return writer.writeBundles(pageBundles.forEachBundleIter(), onBundleWritten);
            })
            .then(function() {
                if (perfLogger.isInfoEnabled()) {
                    perfLogger.info('Page bundles written in ' + (Date.now() - prevStartTime) + 'ms');
                }
                // All of the bundles have now been persisted, now we can
                // generate all of the HTML for the page
                buildHtmlSlots(pageBundles);

                optimizedPage.setLoaderMetadata(optimizerContext.loaderMetadata);


                var pageName = options.name || options.pageName;
                perfLogger.info('Optimized page "' + pageName + '" in ' + (Date.now() - startTime) + 'ms');

                if (optimizerContext.cache) {
                    optimizerContext.cache.flushAll();
                }

                //All done! Resolve the promise with the optimized page
                return optimizedPage;
            });

        if (callback) {
            promise.then(
                function resolved(optimizedPage) {
                    callback(null, optimizedPage);
                })
                .fail(function(err) {
                    callback(err || 'Error while optimizing page');
                })
                .done();
        }

        return promise;
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


        if (options) {
            if (options.basePath) {
                optimizerContext.basePath = options.basePath;
            }

            if (options.context) {
                raptorUtil.extend(optimizerContext, options.context);
                delete options.optimizerContext;
            }
        }

        // WARNING: This prevents a single PageOptimizer from being used to perform multiple
        // optimizations in parallel.
        writer.setContext(optimizerContext);

        optimizerContext.enabledExtensions = options.enabledExtensions;
        optimizerContext.config = this.config;
        optimizerContext.writer = writer;
        optimizerContext.optimizer = this;
        optimizerContext.cache = this.getOptimizerCache(optimizerContext);
        
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

        var cache = this.getCache(optimizerContext);
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
    optimizeResource: function(path, context, callback) {
        if (typeof context === 'function') {
            callback = context;
            context = null;
        }

        ok(callback != null, 'callback is required');
        ok(typeof callback === 'function', 'callback should be a function');

        var promise;

        if (path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('//')) {
            promise = raptorPromises.makePromise({
                url: path
            });
        } else {
            if (!context) {
                // FIXME: WHY IS IT NECESSARY TO CREATE CONTEXT ON THE FLY???
                // -phil
                context = this.createOptimizerContext(context);
            }

            if (isAbsolute(path)) {
                path = nodePath.join(raptorModulesUtil.getProjectRootDir(path), path);
            } else {
                var from;
                if (context.dependency) {
                    from = context.dependency.getDir(context);
                } else {
                    from = raptorModulesUtil.getProjectRootDir(path);
                }
                path = nodePath.join(from, path);
            }

            var writer = this.writer;

            var inputPath = path;

            var hashString = '',
                hashStart = path.indexOf('#');

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

            if (!fs.existsSync(path)) {
                throw new Error('File with path "' + path + '" does not exist');
            }

            var base64Encode = queryString === '?base64';

            // We only do the Base64 encoding if the writer prefers not
            // to do the Base64 encoding or does not support Base64 encoding
            if (base64Encode && writer.base64EncodeSupported !== true) {
                var deferred = raptorPromises.defer();

                fs.readFile(path, null, function(err, data) {
                    if (err) {
                        return deferred.reject(err);
                    }


                    var dataUrl = 'data:' + mime.lookup(path) + ';base64,' + data.toString('base64');
                    deferred.resolve({
                        url: dataUrl
                    });
                });

                promise = deferred.promise;
            }
            else {
                // Record that base 64 encoding was requested for this resource (this might be helpful to the writer)
                if (base64Encode) {
                    context = Object.create(context);
                    context.base64EncodeUrl = base64Encode;
                }

                promise = writer.writeResource(path, context)
                    .then(function(writeResult) {
                        var url = writeResult.url;
                        if (logger.isDebugEnabled()) {
                            logger.debug('Resolved URL: ', inputPath, ' --> ', url);
                        }
                        return writeResult;
                    });
            }
        }

        promise.then(
            function resolved(result) {
                callback(null, result);
            })
            .fail(function(err) {
                callback(err || 'Error while resolving resource URL');
            });

    }
};

raptorUtil.inherit(PageOptimizer, EventEmitter);

module.exports = PageOptimizer;
