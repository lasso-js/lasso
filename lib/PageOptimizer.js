var nodePath = require('path');
var raptorPromises = require('raptor-promises');
var Cache = require('./Cache');
var OptimizedPage = require('./OptimizedPage');
var SlotTracker = require('./SlotTracker');
var promises = require('raptor-promises');
var escapeXmlAttr = require('raptor-xml/util').escapeXmlAttr;
var logger = require('raptor-logging').logger(module);

var mime = require('mime');
var forEachEntry = require('raptor-util').forEachEntry;
var extend = require('raptor-util').extend;
var files = require('raptor-files');
var pageBundlesBuilder = require('./page-bundles-builder');
var BundleMappings = require('./BundleMappings');
var manifestLoader = require('./manifest-loader');
var OptimizerManifest = require('./OptimizerManifest');
var extensions = require('./extensions');

/*
 * Bundle wrappers are objects that describe code prefixes and suffixes that
 * will be written for a bundle when enabled. In in-place-deployment mode,
 * a bundle for a source file might not be written so these wrappers will have
 * no impact on those files.
 */
var DEFAULT_BUNDLE_WRAPPERS = [
    {
        /*
         * This wrapper puts all bundle code in the scope of a function that is provided
         * a define function, require function, and "raptorNoConflict" flag. This allows
         * the raptor module to not to have to put define and require functions in the global
         * scope which might conflict with other AMD-like implementations (such as RequireJS).
         */
        id: 'raptor-no-conflict',
        prefix: '(function(define, require, raptorNoConflict) {\n',
        suffix: '\n})(window.raptorDefine, window.raptorRequire, true);',
        contentType: 'application/javascript'
    }
];
// This function is moved outside the optimagePageCached method to avoid memory
// leak from closures

function evictOptimizedPageFromCache(cache, cacheKey, ttl) {
    logger.info('Scheduling cached object with key "' + cacheKey + '" to be evicted' + ttl + 'ms');
    
    setTimeout(function() {
        logger.info('Evicting cached object with key "' + cacheKey + '". TTL configured to be ' + ttl + 'ms');
        cache.removeOptimizedPage(cacheKey);
    }, ttl);
}

function getOptimizerManifestFromOptions(options) {     
    var optimizerManifest;
    var from = options.from;
    var fromFilename;
    var fromDirname;

    if (from) {
        if (typeof from !== 'object' || !from.filename) {
            throw new Error('Invalid "from" object.');
        }
        fromFilename = module.filename;
        fromDirname = nodePath.dirname(fromFilename);
    }

    if (options.manifest) {
        var manifest = options.manifest;
        if (typeof manifest !== 'string') {
            throw new Error('"manifest" option should be a string');
        }

        optimizerManifest = manifestLoader.load(manifest, fromDirname);
    }
    else if (options.dependencies) {
        var dependencies = options.dependencies;
        
        if (!from) {
            throw new Error('"from" module is required when "dependencies" provided');
        }

        
        optimizerManifest = new OptimizerManifest({
                dependencies: dependencies
            }, fromDirname, fromFilename);
    }

    if (!optimizerManifest) {
        return null;
    }

    return optimizerManifest;
}

function PageOptimizer(config) {
    if (!config) {
        throw new Error('config is required');
    }

    this.config = config;
    this.cacheLookup = {};
    this.cacheProvider = config.cacheProvider || require('raptor-cache').getDefaultProvider();

    this.config.notifyPlugins('pageOptimizerConfigured', {
        config: this.config,
        pageOptimizer: this
    });

    // Look for bundle wrappers from the config object or use the defaults.
    // NOTE: Bundle wrappers have to be explicitly enabled (they're disabled by default).
    //       Bundle wrappers can be enabled in the PageOptimizer Config or BundleConfig.
    var bundleWrappers;
    if (config.wrappers === undefined) {
        bundleWrappers = DEFAULT_BUNDLE_WRAPPERS;
    }

    if (bundleWrappers) {
        // create copy of input bundle wrappers array
        this.bundleWrappers = bundleWrappers.slice();
    }
}

PageOptimizer.prototype = {
    buildPageBundles: function(options, context) {
        var pageName = options.pageName;
        
        var config = this.getConfig();
        var bundleSetConfig = config.getPageBundleSetConfig(pageName);
        var _this = this;

        function buildBundleMappings() {

            function getParentBundleMappings() {
                if (config.isBundlingEnabled()) {
                    //Only load the bundle mappings if bundling is enabled
                    return _this.getBundleMappingsCached(bundleSetConfig, context); 
                }
            }

            function inheritBundleMappings(parentBundleMappings) {
                var bundleMappings = new BundleMappings(config, context);
                if (BundleMappings) {
                    bundleMappings.setParentBundleMappings(parentBundleMappings);
                }
                return bundleMappings;
            }
            
            return promises.resolved()
                .then(getParentBundleMappings)
                .then(inheritBundleMappings);

        }

        return buildBundleMappings()
            .then(function(bundleMappings) {
                return pageBundlesBuilder.build(options, config, bundleMappings, context);        
            });
    },
    
    getBundleMappingsCached: function(bundleSetConfig, context) {
        var cache = this.getCache(context);
        var cacheKey = bundleSetConfig._id;

        var bundleMappingsPromise = cache.getBundleMappings(cacheKey);
        if (!bundleMappingsPromise) {
            
            bundleMappingsPromise = this.config.createBundleMappings(bundleSetConfig, context);
            
            cache.addBundleMappings(bundleSetConfig._id, bundleMappingsPromise);
        }
        return bundleMappingsPromise;
    },

    uncacheBundleMappings: function(bundleSetConfig, context) {
        var cache = this.getCache(context);
        cache.removeBundleMappings(bundleSetConfig._id);
    },

    buildCacheKey: function(context) {

        var config = this.getConfig();
        
        var cacheKey = null;

        function cacheKey_add(str) {
            if (cacheKey) {
                cacheKey += '|' + str;
            }
            else {
                cacheKey = str;
            }
        }

        config.notifyPlugins('buildCacheKey', {
            context: context,
            config: config,
            pageOptimizer: this,
            cacheKey: {
                add: cacheKey_add
            }
        });

        var enabledExtensions = context.enabledExtensions;
        if (enabledExtensions) {
            cacheKey_add(enabledExtensions.getKey());
        }
        
        return cacheKey || '';
    },

    getCache: function(context) {
        var key = this.buildCacheKey(context);
        return this.cacheLookup[key] || (this.cacheLookup[key] = new Cache(this.cacheProvider, context, key));
    },

    clearCache: function() {
        forEachEntry(this.cacheLookup, function(key, cache) {
            cache.clear();
        });
    },

    clearBundleMappingsCache: function() {
        forEachEntry(this.cacheLookup, function(key, cache) {
            logger.info("Removing bundle mappings for cache " + key);
            cache.removeAllBundleMappings();
        });
    },
    
    getConfig: function() {
        return this.config;
    },

    getWriter: function(options) {
        var writer = this.writer;
        if (!writer) {
            writer = options && options.writer;
            if (!writer) {
                var config = this.config;
                if (!config.createWriter) {
                    throw new Error('Writer not configured for page optimizer config');
                }

                writer = config.createWriter();    
            }

            writer.pageOptimizer = this;
            writer.config = this.config;  
        }

        this.writer = writer;

        return writer;
    },
    
    getJavaScriptDependencyHtml: function(url) {
        return '<script type="text/javascript" src="' + escapeXmlAttr(url) + '"></script>';
    },

    getCSSDependencyHtml: function(url) {
        return '<link rel="stylesheet" type="text/css" href="' + escapeXmlAttr(url) + '">';
    },

    optimizePageCached: function(context, cacheKey, options) {
        
        if (!context) {
            context = {};
        }

        var enabledExtensions = extensions.createExtensionSet(context.enabledExtensions);
        /*
         * If there are any globally enabled extensions then add those
         */
        enabledExtensions.addAll(this.config.getEnabledExtensions());
        context.enabledExtensions = enabledExtensions;

        var cache = this.getCache(context);
        var optimizedPage = cache.getOptimizedPage(cacheKey);
        var _this = this;
        var rebuildCacheTimeout = -1;
        var cacheTTL = -1;

        function handleRebuildCacheTimeout() {
            if (rebuildCacheTimeout !== -1) {

                logger.debug('Scheduling optimized page to be rebuilt in ' + rebuildCacheTimeout + 'ms');

                setTimeout(function () {
                    logger.debug('Rebuilding optimizer cache...');
                    try
                    {
                        _this.optimizePage(options)
                            .then(
                                cacheOptimizedPage,
                                handleRebuildCacheTimeout);
                    }
                    catch(e) {
                        logger.error("Error in handleRebuildCacheTimeout: ", e);
                    }
                }, rebuildCacheTimeout);

                rebuildCacheTimeout = -1;
            }
        }

        function handleCacheTimeToLive() {
            if (cacheTTL !== -1) {
                evictOptimizedPageFromCache(cache, cacheKey, cacheTTL);
                cacheTTL = -1;
            }
        }

        function cacheOptimizedPage(optimizedPage) {
            handleRebuildCacheTimeout();
            handleCacheTimeToLive();
        }


        if (!optimizedPage) {
            if (typeof options === 'function') {
                options = options();
            }

            options.enabledExtensions = enabledExtensions;
            options.context = context;

            context.setRebuildCacheTimeout = function(newCacheTimeout) {
                rebuildCacheTimeout = newCacheTimeout;
            };

            context.setCacheTimeToLive = function(newTTL) {
                cacheTTL = newTTL;
            };

            context.isOptimizedPageCached = function() {
                var cachedOptimizedPage = cache.getOptimizedPage(cacheKey);
                return cachedOptimizedPage && !promises.isPromise(cachedOptimizedPage);
            };

            var optimizedPagePromise = this.optimizePage(options);

            optimizedPage = optimizedPagePromise;
            
            cache.addOptimizedPage(cacheKey, optimizedPagePromise);

            optimizedPagePromise
                .then(cacheOptimizedPage)
                .fail(function() {
                    // Remove the failed promise so that we can try again next time
                    cache.removeOptimizedPage(cacheKey);
                });
        }

        return optimizedPage;
    },
    
    optimizePage: function(options) {
        var startTime = new Date().getTime();
        // if we create a new context then make sure we put it
        // back into the options object for reference later
        var context = options.context || (options.context = {});
        var config = this.getConfig();
        var optimizerManifest = getOptimizerManifestFromOptions(options);
        if (!optimizerManifest) {
            throw new Error('Invalid options. "package" or "optimizerManifest" expected. Options: ' + require('util').inspect(options));
        }

        options.optimizerManifest = optimizerManifest;

        if (options.basePath) {
            context.basePath = options.basePath;
        }

        var pluginContext = {
            context: context,
            config: config,
            options: options,
            pageOptimizer: this
        };

        config.notifyPlugins('beforeOptimizePage', pluginContext);


        var writer = this.getWriter(options);
        writer.setContext(context);
        var optimizedPage = new OptimizedPage();
        
        var slotTracker = new SlotTracker();
        var _this = this;

        context.config = config;
        context.writer = writer;
        context.optimizer = this;

        if (!context.attributes) {
            context.attributes = {};
        }

        if (config.bundleWrappers) {
            logger.info('Enabled bundle wrappers: ' + Object.keys(config.bundleWrappers).join(', ') + ' (these can be overridden at the bundle level)');
        } else {
            logger.info('No bundle wrappers enabled (this can be overridden at the bundle level)');
        }

        function registerBundle(bundle, async) {

            if (!async) {
                optimizedPage.addUrl(bundle.getUrl(context), bundle.getSlot(), bundle.getContentType());
                
                if (bundle.outputFile) {
                    optimizedPage.addFile(bundle.outputFile, bundle.getContentType());
                }
                else if (bundle.sourceResource) {
                    optimizedPage.addFile(bundle.sourceResource.getAbsolutePath(), bundle.getContentType());
                }
            }
            else {
                // TODO: Should we track URLs and files for async-only bundles?
            }
        }

        function onBundleWritten(bundle) {
            registerBundle(bundle, false);
        }

        function onAsyncBundleWritten(bundle) {
            registerBundle(bundle, true);
        }

        function buildHtmlSlots(pageBundles) {
            pageBundles.forEachBundle(function(bundle) {
                var html,
                    url;
                
                if (bundle.isInline() && !bundle.inPlaceDeployment) {
                    if (bundle.isMergeInline()) {
                        slotTracker.addContent(bundle.getSlot(), bundle.getContentType(), bundle.getCode(), true /* inline */);
                    }
                    else {
                        slotTracker.addContentBlock(bundle.getSlot(), bundle.getContentType(), bundle.getCode());
                    }
                }
                else {
                    url = bundle.getUrl(context);

                    if (bundle.isJavaScript()) {
                        html = _this.getJavaScriptDependencyHtml(url);
                    }
                    else if (bundle.isStyleSheet()) {
                        html = _this.getCSSDependencyHtml(url);
                    }
                    else {
                        throw new Error("Invalid bundle content type: " + bundle.getContentType());
                    }
                    slotTracker.addContent(bundle.getSlot(), bundle.getContentType(), html, (!bundle.inPlaceDeployment && bundle.isInline()));
                }
            });

            optimizedPage.setHtmlBySlot(slotTracker.getHtmlBySlot());
        }

        var pageBundles;

        return this.buildPageBundles(options, context)
            .then(function(_pageBundles) {
                pageBundles = _pageBundles;
                // First write out all of the async bundles
                return writer.writeBundles(pageBundles.forEachAsyncBundleIter(), onAsyncBundleWritten);
            })
            .then(function() {
                // Now write out all of the non-async bundles
                return writer.writeBundles(pageBundles.forEachBundleIter(), onBundleWritten);
            })
            .then(function() {
                // All of the bundles have now been persisted, now we can
                // generate all of the HTML for the page
                buildHtmlSlots(pageBundles);

                optimizedPage.setLoaderMetadata(context.loaderMetadata);


                var pageName = options.name || options.pageName;
                logger.info('Optimized page "' + pageName + '" in ' + (Date.now() - startTime) + 'ms');

                //All done! Resolve the promise with the optimized page
                return optimizedPage;
            });
    },

    getBundleWrappers: function() {
        return this.bundleWrappers;
    },

    isWrapperEnabledForBundle: function(wrapper, bundle) {
        var wrapperId = wrapper.id;

        if (wrapper.contentType !== bundle.getContentType()) {
            logger.debug('Bundle wrapper "' + wrapperId + '" with contentType "' + wrapper.contentType + '" does not match bundle content type of "' + bundle.getContentType() + '"');
            return false;
        }

        // are there any wrappers explicitly configured for the bundle?
        var enabledWrappers = bundle.getWrappers();
        if (bundle.wrappers === undefined) {
            // no wrappers set at the bundle level so check for which wrappers have been "globally" enabled
            enabledWrappers = this.config.bundleWrappers;
        }

        return (enabledWrappers && (enabledWrappers[wrapperId] === true));
    },

    resolveResourceUrlCached: function(path, context) {
        var cache = this.getCache(context);
        var resourceUrl = cache.getResourceUrl(path);
        if (resourceUrl) {
            return resourceUrl;
        }

        resourceUrl = this.resolveResourceUrl(path, context);
        cache.addResourceUrl(path, resourceUrl);

        resourceUrl
            .fail(function() {
                // Remove the cached resource URL if the promise
                // is rejected in order to give the system
                // a chance to recover
                cache.removeResourceUrl(path);
            });

        return resourceUrl;
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
    resolveResourceUrl: function(path, context) {
        if (path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("//")) {
            return path;
        }

        if (!path.startsWith('/')) {
            var from;

            if (context.dependency) {
                from = context.dependency.getParentManifestDir();
            }

            if (!from) {
                throw new Error('"from" argument is required for relative paths');
            }

            path = nodePath.resolve(from, path);
        }

        

        var writer = this.getWriter();

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

        if (!files.exists(path)) {
            throw new Error('File with path "' + path + '" does not exist');
        }

        var base64Encode = queryString === '?base64';

        if (base64Encode && writer.base64EncodeSupported !== true) {
            // We only do the Base64 encoding if the writer prefers not
            // to do the Base64 encoding or does not support Base64 encoding
            var dataUrl = 'data:' + mime.lookup(path) + ';base64,' + files.readAsBinary(path).toString('base64');
            return raptorPromises.makePromise(dataUrl);
        }
        else {
            // Record that base 64 encoding was requested for this resource (this might be helpful to the writer)
            if (base64Encode) {
                context = Object.create(context || {});
                context.base64EncodeUrl = base64Encode;
            }
            
            return writer.writeResource(path, context)
                .then(function(writeResult) {
                    var url = writeResult.url;
                    logger.debug("Resolved URL: ", inputPath, ' --> ', url);
                    return url;
                });
        }
    }
};

module.exports = PageOptimizer;