var nodePath = require('path');
var LassoCache = require('./LassoCache');
var LassoPageResult = require('./LassoPageResult');
var LassoContext = require('./LassoContext');
var SlotTracker = require('./SlotTracker');
var escapeXmlAttr = require('raptor-util/escapeXml').attr;
var logger = require('raptor-logging').logger(module);
var EventEmitter = require('events').EventEmitter;
var mime = require('mime');
var raptorUtil = require('raptor-util');
var pageBundlesBuilder = require('./page-bundles-builder');
var BundleMappings = require('./BundleMappings');
var manifestLoader = require('./manifest-loader');
var LassoManifest = require('./LassoManifest');
var flags = require('./flags');
var dependencies = require('./dependencies');
var fs = require('fs');
var commaSeparatedRegExp = /\s*,\s*/;
var ok = require('assert').ok;
var bundleBuilder = require('./bundle-builder');
var isAbsolute = require('./path').isAbsolute;
var createWriter = require('./writers').createWriter;
var raptorModulesUtil = require('raptor-modules/util');
var perfLogger = require('raptor-logging').logger('lasso/perf');
var extend = require('raptor-util/extend');
var cachingFs = require('./caching-fs');
var createError = require('raptor-util/createError');
var series = require('raptor-async/series');
var raptorPromises = require('raptor-promises');

var urlRegExp  = /^[^:\/]{0,5}[:]?\/\//;

function isExternalUrl(path) {
    return urlRegExp.test(path);
}


function getLassoManifestFromOptions(options, dependencyRegistry, callback) {
    var lassoManifest;
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

    var lassoManifestOptions;

    if (options.packagePath) {
        var packagePath = options.packagePath;

        if (typeof packagePath !== 'string') {
            return callback(new Error('"packagePath" option should be a string'));
        }

        if (!fromDirname) {
            fromDirname = nodePath.dirname(packagePath);
        }

        lassoManifest = manifestLoader.load(packagePath, fromDirname);
        if (lassoManifest) {
            lassoManifestOptions = {
                manifest: lassoManifest,
                dependencyRegistry: dependencyRegistry,
                dirname: lassoManifest.dirname,
                filename: lassoManifest.filename
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

                callback(null, new LassoManifest({
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

        lassoManifestOptions = {
            manifest: {
                dependencies: dependencies
            },
            dependencyRegistry: dependencyRegistry,
            dirname: fromDirname,
            filename: fromFilename
        };

    } else if (options.lassoManifest) {
        lassoManifestOptions = {
            manifest: options.lassoManifest,
            dependencyRegistry: dependencyRegistry,
            dirname: options.lassoManifest.dirname || process.cwd(),
            filename: options.lassoManifest.filename
        };

    } else if (options.packagePaths) {
        lassoManifestOptions = {
            manifest: {
                dependencies: options.packagePaths
            },
            dependencyRegistry: dependencyRegistry,
            dirname: process.cwd(),
            filename: undefined
        };
    }

    if (lassoManifestOptions) {
        callback(null, new LassoManifest(lassoManifestOptions));
    } else {
        callback(null, null);
    }
}

function doLassoPage(theLasso, options, lassoContext, callback) {
    var logInfoEnabled = logger.isInfoEnabled();
    var perfLogInfoEnabled = perfLogger.isInfoEnabled();

    var startTime = Date.now();

    // if we create a new context then make sure we put it
    // back into the options object for reference later
    var pageName = lassoContext.pageName = options.pageName || options.name;

    var config = theLasso.config;
    getLassoManifestFromOptions(options, theLasso.dependencies, function(err, lassoManifest) {
        if (!lassoManifest) {
            callback(new Error('Invalid options. "dependencies", "packagePath" or "lassoManifest" expected. Options: ' + require('util').inspect(options)));
        }

        options.lassoManifest = lassoManifest;

        var pluginContext = {
            context: lassoContext,
            config: config,
            options: options,
            lasso: theLasso
        };

        // TODO: Deprecate this
        theLasso.emit('beforeOptimizePage', pluginContext);
        theLasso.emit('beforeLassoPage', pluginContext);

        var lassoPageResult = new LassoPageResult();
        var slotTracker = new SlotTracker();

        var writer = lassoContext.writer;



        function onBundleWritten(bundle) {
            if (logInfoEnabled) {
                logger.info('Bundle ' + bundle + ' written.');
            }
            lassoPageResult.registerBundle(bundle, false, lassoContext);
        }

        function onAsyncBundleWritten(bundle) {
            if (logInfoEnabled) {
                logger.info('Bundle ' + bundle + ' (async) written.');
            }
            lassoPageResult.registerBundle(bundle, true, lassoContext);
        }

        function buildHtmlSlots(pageBundles) {
            pageBundles.forEachBundle(function(bundle) {
                var html,
                    url;

                if (bundle.isInline()) {
                    slotTracker.addInlineCode(bundle.getSlot(), bundle.getContentType(), bundle.getCode(), bundle.getInlinePos(), bundle.isMergeInline());
                } else {
                    url = bundle.getUrl(lassoContext);

                    if (bundle.isJavaScript()) {
                        html = theLasso.getJavaScriptDependencyHtml(url);
                    } else if (bundle.isStyleSheet()) {
                        html = theLasso.getCSSDependencyHtml(url);
                    } else if (!bundle.hasContent()) {
                        // ignore this bundle because contentType is "none"
                        return;
                    } else {
                        throw new Error('Invalid bundle content type: ' + bundle.getContentType());
                    }
                    slotTracker.addContent(bundle.getSlot(), bundle.getContentType(), html);
                }
            });

            lassoPageResult.setHtmlBySlot(slotTracker.getHtmlBySlot());
        }

        var pageBundles;

        var prevStartTime = startTime;

        var asyncTasks = [
            function buildPageBundles(callback) {
                theLasso.buildPageBundles(options, lassoContext, function(err, _pageBundles) {
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

                lassoContext.setPhase('write-async-page-bundles');

                // First write out all of the async bundles
                writer.writeBundles(pageBundles.forEachAsyncBundleIter(), onAsyncBundleWritten, lassoContext, callback);
            },
            function writeSyncBundles(callback) {
                if (perfLogInfoEnabled) {
                    perfLogger.info('Async page bundles written in ' + (Date.now() - prevStartTime) + 'ms');
                }
                prevStartTime = Date.now();

                lassoContext.setPhase('write-page-bundles');


                // Now write out all of the non-async bundles
                writer.writeBundles(pageBundles.forEachBundleIter(), onBundleWritten, lassoContext, callback);
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

            perfLogger.info('Built page "' + pageName + '" in ' + (Date.now() - startTime) + 'ms');

            if (lassoContext.cache) {
                lassoContext.cache.flushAll();
            }

            callback(null, lassoPageResult);
        });
    });
}

function doLassoResource(theLasso, path, options, lassoContext, callback) {

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

    if (isExternalUrl(path)) {
        return done(null, {
            url: path
        });
    } else {
        if (!isAbsolute(path)) {
            var dir = lassoContext.dir || raptorModulesUtil.getProjectRootDir(path);
            path = nodePath.join(dir, path);
        }

        var writer = theLasso.writer;

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
        } else {
            // Record that base 64 encoding was requested for this resource (this might be helpful to the writer)
            if (base64Encode) {
                lassoContext = Object.create(lassoContext);
                lassoContext.base64EncodeUrl = base64Encode;
            }

            writer.writeResource(path, lassoContext, done);
        }
    }
}

function Lasso(config) {
    ok(config, 'config is required');

    Lasso.$super.call(this);

    this.config = config;

    // LassoCache instances cache information associated with a specific
    this.lassoCacheLookup = {};

    this.dependencies = dependencies.createRegistry();

    this.initPlugins();

    var writer = this.writer;
    if (!writer) {
        if (!config.writer) {
            throw new Error('Writer not configured for page lasso config');
        }

        writer = createWriter(config.writer);

        writer.lasso = this;
        writer.config = this.config;
    }

    this.writer = writer;

    this.emit('lassoConfigured', {
        config: this.config,
        lasso: this
    });
}

Lasso.prototype = {

    initPlugins: function() {
        var plugins = this.config.getPlugins();
        for (var i=0; i<plugins.length; i++) {
            var plugin = plugins[i];
            plugin.func(this, plugin.config || {});
        }
    },

    createAppBundleMappings: function(bundleSetConfig, lassoContext, callback) {
        ok(bundleSetConfig, '"bundleSetConfig" is required');
        ok(typeof callback === 'function', 'callback function is required');

        var dependencyRegistry = this.dependencies;
        var bundleMappings = new BundleMappings(this.config);

        var asyncTasks = [];

        bundleSetConfig.forEachBundleConfig(function(bundleConfig) {
            var bundleName = bundleConfig.name;

            ok(bundleName, 'Illegal state. Bundle name is required');

            asyncTasks.push(function(callback) {
                bundleBuilder.buildBundle(
                    bundleMappings,
                    dependencyRegistry,
                    bundleConfig,
                    lassoContext,
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

    buildPageBundles: function(options, lassoContext, callback) {
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

            var bundleMappings = new BundleMappings(config, lassoContext.pageName);

            if (appBundleMappings) {
                bundleMappings.setParentBundleMappings(appBundleMappings);
            }

            if (perfLogger.isInfoEnabled()) {
                perfLogger.debug('Bundle mappings built in ' + (Date.now() - startTime) + 'ms');
            }

            pageBundlesBuilder.build(options, config, bundleMappings, lassoContext, callback);
        }

        if (config.isBundlingEnabled()) {
            _this.getAppBundleMappingsCached(bundleSetConfig, lassoContext, buildPageBundleMappings);
        } else{
            buildPageBundleMappings();
        }
    },

    getAppBundleMappingsCached: function(bundleSetConfig, lassoContext, callback) {
        var lassoCache = this.getLassoCache(lassoContext);
        var cacheKey = bundleSetConfig._id;
        var _this = this;

        var builder = function(callback) {
            _this.createAppBundleMappings(bundleSetConfig, lassoContext, callback);
        };

        lassoCache.getBundleMappings(cacheKey, builder, callback);
    },

    buildLassoCacheKey: function(lassoContext) {

        //var config = this.getConfig();

        var hash = 5381;

        function cacheKey_add(str) {
            var i = str.length;
            while(i) {
                hash = (hash * 33) ^ str.charCodeAt(--i);
            }
        }

        //cacheKey_add()

        this.emit('buildCacheKey', {
            context: lassoContext,
            config: this.config,
            lasso: this,
            cacheKey: {
                add: cacheKey_add
            }
        });

        var flags = lassoContext.flags;
        if (flags) {
            cacheKey_add(flags.getKey());
        }

        cacheKey_add(lassoContext.config.getConfigFingerprint());

        if (hash < 0) {
            hash = 0 - hash;
        }

        return hash.toString();
    },

    /**
     * This method is used by the lasso page tag to
     * @param {Object} options is an object with the following properties:
     *    - page: the render context
     *    - flags: an array of enabled flags
     * @return {LassoCache} the lasso cache associated with this page lasso
     */
    getLassoCache: function(lassoContext) {
        var cache = lassoContext.cache;
        if (!cache) {
            var config = this.getConfig();

            var key = this.buildLassoCacheKey(lassoContext);
            cache = this.lassoCacheLookup[key];
            if (!cache) {
                cache = this.lassoCacheLookup[key] = new LassoCache(key, {
                        dir: config.getCacheDir(),
                        profile: config.getCacheProfile(),
                        profiles: config.getCacheProfiles()
                    });

                var pluginContext = {
                    context: lassoContext,
                    config: config,
                    options: lassoContext.options,
                    lasso: this,
                    cacheKey: key,
                    lassoCache: cache,
                };

                this.emit('lassoCacheCreated', pluginContext);
            }

            lassoContext.cache = cache;
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

    _resolveflags: function(options) {
        var flagSet = flags.createFlagSet();

        if (options) {
            var additionalFlags = options.flags || options.extensions || options.enabledExtensions;
            if (additionalFlags) {
                if (typeof additionalFlags === 'string') {
                    additionalFlags = additionalFlags.split(commaSeparatedRegExp);
                }
                flagSet.addAll(additionalFlags);
            }
        }

        flagSet.addAll(this.config.getFlags());

        return flagSet;
    },


    /**
     * A LassoContext is created for each call to Lasso::lassoPage
     * The LassoContext contains the following:
     * - flags: Complete list of enabled flags
     * - writer: A reference to the write configured by the Lasso
     * - lasso: A reference to the Lasso
     * - cache: Lasso.jsC
     */
    createLassoContext: function(options) {
        var writer = this.writer;
        var lassoContext = new LassoContext();

        options = options || {};

        if (options.basePath) {
            lassoContext.basePath = options.basePath;
        }

        if (options.data) {
            raptorUtil.extend(lassoContext.data, options.data);
            delete options.data;
        }

        lassoContext.dependencyRegistry = this.dependencies;
        lassoContext.flags = this._resolveflags(options);
        lassoContext.config = this.config;
        lassoContext.writer = writer;
        lassoContext.lasso = this;
        lassoContext.cache = this.getLassoCache(lassoContext);
        lassoContext.options = options;

        return lassoContext;
    },

    lassoPage: function(options, callback) {
        var _this = this;

        var deferred;

        if (!callback) {
            deferred = raptorPromises.defer();
        }

        function done(e, lassoPageResult) {
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
                deferred.resolve(lassoPageResult);
            }

            if (callback) {
                callback(null, lassoPageResult);
            }
        }

        var lassoContext = options.lassoContext || this.createLassoContext(options);

        if (options.cache !== false) {

            var lassoCache = this.getLassoCache(lassoContext);
            var cacheKey = options.cacheKey || options.pageName || options.name;

            lassoCache.getLassoPageResult(
                cacheKey,
                {
                    builder: function(callback) {
                        options = extend({}, options);

                        // Reuse the same lasso context
                        options.lassoContext = lassoContext;
                        doLassoPage(_this, options, lassoContext, callback);
                    }
                },
                done);


        } else {
            doLassoPage(_this, options, lassoContext, done);
        }

        if (!callback) {
            return deferred.promise;
        }
    },

    /**
     *
     *
     * @param  {String} path The file path of the resource to bundle
     * @param  {Object} options (see below for supported options)
     * @param  {Function(err, result)} callback Callback function. Result will be an object with a "url" property
     *
     * @return {Promise} The promise that will eventually resolve to the URL
     */
    lassoResource: function(path, options, callback) {
        var lassoContext;

        if (typeof options === 'function') {
            callback = options;
            options = {};
        } else if (options.LassoContext === true ){
            lassoContext = options;
            options = {};
        } else if (!options) {
            options = {};
        }

        if (!lassoContext) {
            lassoContext = options.lassoContext || this.createLassoContext(options);
        }

        var _this = this;

        if (options.cache !== false) {
            var cache = this.getLassoCache(lassoContext);
            var cacheKey = path;

            if (!isAbsolute(path)) {
                cacheKey += lassoContext.dir;
            }

            cache.getLassoedResource(
                cacheKey,
                function(callback) {
                    doLassoResource(_this, path, options, lassoContext, callback);
                },
                callback);
        } else {
            doLassoResource(_this, path, options, lassoContext, callback);
        }
    },

    addTransform: function(transform) {
        this.config.addTransform(transform);
    }
};

// TODO: Deprecate this
Lasso.prototype.optimizePage = Lasso.prototype.lassoPage;
// TODO: Deprecate this
Lasso.prototype.optimizeResource = Lasso.prototype.lassoResource;


raptorUtil.inherit(Lasso, EventEmitter);

module.exports = Lasso;
