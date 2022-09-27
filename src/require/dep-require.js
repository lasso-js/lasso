const nodePath = require('path');
const ok = require('assert').ok;
const equal = require('assert').equal;
const VAR_REQUIRE_PROCESS = 'process=require("process")';
const VAR_REQUIRE_BUFFER = 'Buffer=require("buffer").Buffer';

const inspectCache = require('./inspect-cache');
const Deduper = require('./util/Deduper');
const normalizeMain = require('lasso-modules-client/transport').normalizeMain;
const lassoCachingFS = require('lasso-caching-fs');
const lassoPackageRoot = require('lasso-package-root');
const normalizeFSPath = require('./util/normalizeFSPath');
const crypto = require('crypto');

function buildAsyncInfo(path, asyncBlocks, lassoContext) {
    if (asyncBlocks.length === 0) {
        return null;
    }

    const key = 'require-async|' + normalizeFSPath(path);
    let asyncInfo = lassoContext.data[key];

    if (!asyncInfo) {
        asyncInfo = lassoContext.data[key] = {
            asyncMeta: {},
            asyncBlocks
        };

        asyncBlocks.forEach(function(asyncBlock, i) {
            if (!asyncBlock.hasInlineDependencies &&
                !asyncBlock.hasFunctionBody) {
                // only generate a unique package name if the async
                // function call was provided a `function` as the
                // last argument or if an array of dependencies were
                // inlined.
                return;
            }

            const hash = '_' + crypto.createHash('sha1')
                .update(key)
                .update(String(i))
                .digest('hex')
                .substring(0, 6);

            const name = asyncBlock.name = hash;
            asyncInfo.asyncMeta[name] = asyncBlock.dependencies;
        });
    }

    return asyncInfo;
}

function create(config, lasso) {
    config = config || {};
    const globals = config.globals;
    const getClientPath = config.getClientPath;

    const readyDependency = lasso.dependencies.createDependency({
        type: 'commonjs-ready',
        inline: 'end',
        slot: config.lastSlot
    }, __dirname);

    const runtimeDependency = lasso.dependencies.createDependency({
        type: 'commonjs-runtime'
    }, __dirname);

    function handleMetaRemap(metaEntry, deduper) {
        const from = metaEntry.from;
        const to = metaEntry.to;

        const remapKey = deduper.remapKey(from, to);
        if (!deduper.hasRemap(remapKey)) {
            const fromPath = getClientPath(from);
            let toPath;

            if (to === false) {
                toPath = false;
            } else {
                toPath = getClientPath(to);
            }

            deduper.addDependency(remapKey, {
                type: 'commonjs-remap',
                from: fromPath,
                to: toPath,
                fromFile: from
            });
        }
    }

    function handleMetaInstalled(metaEntry, deduper) {
        const packageName = metaEntry.packageName;
        const searchPath = metaEntry.searchPath;
        const fromDir = metaEntry.fromDir;
        const basename = nodePath.basename(searchPath);

        if (basename === 'node_modules') {
            const childName = packageName;
            const parentPath = lassoPackageRoot.getRootDir(fromDir);
            const pkg = lassoCachingFS.readPackageSync(nodePath.join(searchPath, packageName, 'package.json'));
            const childVersion = (pkg && pkg.version) || '0';

            const key = deduper.installedKey(parentPath, childName, childVersion);

            if (!deduper.hasInstalled(key)) {
                const clientParentPath = getClientPath(parentPath);

                deduper.addDependency(key, {
                    type: 'commonjs-installed',
                    parentPath: clientParentPath,
                    childName,
                    childVersion,
                    parentDir: parentPath
                });
            }
        } else {
            const key = deduper.searchPathKey(searchPath);
            if (!deduper.hasSearchPath(key)) {
                let clientSearchPath = getClientPath(searchPath);
                if (!clientSearchPath.endsWith('/')) {
                    // Search paths should always end with a forward slash
                    clientSearchPath += '/';
                }
                // This is a non-standard standard search path entry
                deduper.addDependency(key, {
                    type: 'commonjs-search-path',
                    path: clientSearchPath
                });
            }
        }
    }

    function handleMetaMain(metaEntry, deduper) {
        const dir = metaEntry.dir;
        const main = metaEntry.main;

        const key = deduper.mainKey(dir, main);

        if (!deduper.hasMain(key)) {
            const dirClientPath = getClientPath(metaEntry.dir);
            const relativePath = normalizeMain(metaEntry.dir, metaEntry.main);

            deduper.addDependency(key, {
                type: 'commonjs-main',
                dir: dirClientPath,
                main: relativePath,
                _sourceFile: metaEntry.main
            });
        }
    }

    function handleMetaBuiltin(metaEntry, deduper) {
        const name = metaEntry.name;
        const target = metaEntry.target;

        const key = deduper.builtinKey(name, target);

        if (!deduper.hasBuiltin(key)) {
            const targetClientPath = getClientPath(metaEntry.target);

            deduper.addDependency(key, {
                type: 'commonjs-builtin',
                name,
                target: targetClientPath,
                _sourceFile: metaEntry.target
            });
        }
    }

    function handleMeta(meta, deduper) {
        for (let i = 0; i < meta.length; i++) {
            const metaEntry = meta[i];
            switch (metaEntry.type) {
            case 'remap':
                handleMetaRemap(metaEntry, deduper);
                break;
            case 'installed':
                handleMetaInstalled(metaEntry, deduper);
                break;
            case 'main':
                handleMetaMain(metaEntry, deduper);
                break;
            case 'builtin':
                handleMetaBuiltin(metaEntry, deduper);
                break;
            default:
                throw new Error('Unsupported meta entry: ' + JSON.stringify(metaEntry));
            }
        }
    }
    return {
        properties: {
            path: 'string',
            from: 'string',
            run: 'boolean',
            wait: 'boolean',
            resolved: 'object',
            virtualModule: 'object',
            requireHandler: 'object'
        },

        async init (lassoContext) {
            if (!this.path && !this.virtualModule) {
                const error = new Error('Invalid "require" dependency. "path" property is required');
                console.error(module.id, error.stack, this);
                throw error;
            }

            if (!this.resolved) {
                const virtualModule = this.virtualModule;

                if (virtualModule) {
                    const path = virtualModule.path || this.path;
                    ok(path, '"path" is required for a virtual module');

                    this.path = path;
                    if (!this.from) {
                        this.from = nodePath.dirname(path);
                    }

                    const clientPath = virtualModule.clientPath || getClientPath(path);

                    this.resolved = {
                        path,
                        clientPath
                    };
                } else if (this.path) {
                    const from = this.from = this.from || this.getParentManifestDir();
                    const path = this.path;
                    const fromFile = this.getParentManifestPath();
                    const fromFileRelPath = fromFile ? nodePath.relative(process.cwd(), fromFile) : '(unknown)';
                    this.resolved = lassoContext.resolveCached(path, from);

                    if (!this.resolved) {
                        throw new Error('Module not found: ' + path + ' (from "' + from + '" and referenced in "' + fromFileRelPath + '")');
                    }

                    this.meta = this.resolved.meta;
                }
            }

            if (this.run === true) {
                if (this.wait == null && config.runImmediately === true) {
                    this.wait = false;
                }

                this.wait = this.wait !== false;
            }

            ok(this.path);
        },

        toString: function() {
            return '[require: ' + this.path + ']';
        },

        calculateKey() {
            // This is a unique key that prevents the same dependency from being
            // added to the dependency graph repeatedly
            let key = 'modules-require:' + this.path + '@' + this.from;
            if (this.run) {
                key += '|run';

                if (this.wait === false) {
                    key += '|wait';
                }
            }
            return key;
        },

        getDir: function() {
            return nodePath.dirname(this.resolved.path);
        },

        getRequireHandler: function(lassoContext) {
            const resolved = this.resolved;
            let requireHandler = this.requireHandler;

            if (!requireHandler) {
                const virtualModule = this.virtualModule;
                if (virtualModule) {
                    const virtualPath = resolved.path || virtualModule.path || '';
                    requireHandler = lassoContext.dependencyRegistry.createRequireHandler(virtualPath, lassoContext, virtualModule);
                    requireHandler.includePathArg = false;
                }
            }

            if (!requireHandler) {
                requireHandler = lassoContext.dependencyRegistry.getRequireHandler(resolved.path, lassoContext);

                if (!requireHandler) {
                    return null;
                }
            }

            const transforms = config.transforms;
            if (transforms) {
                const defaultCreateReadStream = requireHandler.createReadStream.bind(requireHandler);
                const transformedRequireHandler = Object.create(requireHandler);

                transformedRequireHandler.createReadStream = function createdTransformedReadStream() {
                    const inStream = defaultCreateReadStream();
                    return transforms.apply(resolved.path, inStream, lassoContext);
                };
                return transformedRequireHandler;
            } else {
                return requireHandler;
            }
        },

        async getDependencies (lassoContext) {
            ok(lassoContext, '"lassoContext" argument expected');

            // the array of dependencies that we will be returning
            const dependencies = [];
            const deduper = new Deduper(lassoContext, dependencies);

            // Include client module system if needed and we haven't included it yet
            if (config.includeClient !== false) {
                deduper.addRuntime(runtimeDependency);
            }

            if (this.meta) {
                handleMeta(this.meta, deduper);
            }

            if (!lassoContext.isAsyncBundlingPhase()) {
                // Add a dependency that will trigger all of the deferred
                // run modules to run once all of the code has been loaded
                // for the page
                deduper.addReady(readyDependency);
            }

            const resolved = this.resolved;

            if (resolved.voidRemap) {
                // This module has been remapped to a void/empty object
                // because it is a server-side only module. Nothing
                // else to do.
                return dependencies;
            }

            const run = this.run === true;
            const wait = this.wait !== false;

            if (resolved.type) {
                // This is not really a require dependency since a type was provided
                dependencies.push({
                    type: resolved.type,
                    path: resolved.path
                });
                return dependencies;
            }

            const requireHandler = this.getRequireHandler(lassoContext);

            if (!requireHandler) {
                // This is not really a dependency that compiles down to a CommonJS module
                // so just add it to the dependency graph
                dependencies.push(resolved.path);
                return dependencies;
            }

            const dirname = nodePath.dirname(resolved.path);

            return requireHandler.init()
                .then(() => {
                    if (requireHandler.getDependencies) {
                        // A require extension can provide its own `getDependencies` method to provide
                        // additional dependencies beyond what will automatically be discovered using
                        // static code analysis on the CommonJS code associated with the dependency.
                        return requireHandler.getDependencies().then((additionalDependencies) => {
                            if (additionalDependencies && additionalDependencies.length) {
                                additionalDependencies.forEach((dep) => {
                                    dependencies.push(dep);
                                });
                            }
                        });
                    }
                })
                .then(() => {
                    // Fixes https://github.com/lasso-js/lasso-require/issues/21
                    // Static JavaScript objects should not need to be inspected
                    if (requireHandler.object) {
                        // Don't actually inspect the required module if it is an object.
                        // For example, this would be the case with require('./foo.json')
                        return requireHandler.getLastModified()
                            .then((lastModified) => {
                                return {
                                    createReadStream: requireHandler.createReadStream.bind(requireHandler),
                                    lastModified
                                };
                            });
                    }

                    return inspectCache.inspectCached(
                        resolved.path,
                        requireHandler,
                        lassoContext,
                        config);
                })
                .then((inspectResult) => {
                    let asyncMeta;
                    let asyncBlocks;

                    if (inspectResult && inspectResult.asyncBlocks && inspectResult.asyncBlocks.length) {
                        const asyncInfo = buildAsyncInfo(resolved.path, inspectResult.asyncBlocks, lassoContext);
                        if (asyncInfo) {
                            asyncBlocks = asyncInfo.asyncBlocks;
                            asyncMeta = asyncInfo.asyncMeta;
                        }
                    }

                    // require was for a source file
                    let additionalVars;
                    ok(inspectResult, 'inspectResult should not be null');

                    // the requires that were read from inspection (may remain undefined if no inspection result)
                    const requires = inspectResult.requires;

                    if (inspectResult.foundGlobals && (inspectResult.foundGlobals.process || inspectResult.foundGlobals.Buffer)) {
                        additionalVars = [];
                        const addGlobalVar = (path, varCode) => {
                            const resolved = lassoContext.resolve(path, dirname);
                            if (resolved.meta) {
                                handleMeta(resolved.meta, deduper);
                            }

                            const requireKey = deduper.requireKey(path, dirname);

                            if (!deduper.hasRequire(requireKey)) {
                                deduper.addDependency(requireKey, {
                                    type: 'require',
                                    path,
                                    from: dirname
                                });
                            }

                            additionalVars.push(varCode);
                        };

                        if (inspectResult.foundGlobals.process) {
                            addGlobalVar('process', VAR_REQUIRE_PROCESS);
                        }

                        if (inspectResult.foundGlobals.Buffer) {
                            addGlobalVar('buffer', VAR_REQUIRE_BUFFER);
                        }
                    }

                    ok(inspectResult.createReadStream, 'createReadStream expected after inspectResult');
                    ok(inspectResult.lastModified, 'lastModified expected after inspectResult');
                    equal(typeof inspectResult.lastModified, 'number', 'lastModified should be a number');

                    const globalVars = globals ? globals[this.resolved.path] : null;

                    // Also check if the directory has an browser.json and if so we should include that as well
                    let lassoJsonPath = nodePath.join(dirname, 'browser.json');
                    if (lassoContext.cachingFs.existsSync(lassoJsonPath)) {
                        dependencies.push({
                            type: 'package',
                            path: lassoJsonPath
                        });
                    } else {
                        lassoJsonPath = nodePath.join(dirname, 'optimizer.json');
                        if (lassoContext.cachingFs.existsSync(lassoJsonPath)) {
                            // TODO Show a deprecation warning here
                            dependencies.push({
                                type: 'package',
                                path: lassoJsonPath
                            });
                        }
                    }

                    // Include all additional dependencies (these were the ones found in the source code)
                    if (requires && requires.length) {
                        requires.forEach(function(inspectResultRequire) {
                            const inspectResultResolved = inspectResultRequire.resolved;

                            const meta = inspectResultResolved.meta;
                            if (meta) {
                                handleMeta(meta, deduper);
                            }

                            const path = inspectResultRequire.path;

                            const requireKey = deduper.requireKey(path, dirname);

                            if (!deduper.hasRequire(requireKey)) {
                                deduper.addDependency(requireKey, {
                                    type: 'require',
                                    path: inspectResultRequire.path,
                                    from: dirname,
                                    resolved: inspectResultResolved
                                });
                            }
                        });
                    }

                    const defKey = deduper.defKey(resolved.clientPath);

                    if (!deduper.hasDef(defKey)) {
                        const defDependency = {
                            type: 'commonjs-def',
                            path: resolved.clientPath,
                            file: resolved.path
                        };

                        if (requireHandler.getDefaultBundleName) {
                            // A `virtualModule` object provided a
                            // `getDefaultBundleName` that we will use to
                            // create the define dependency.
                            defDependency.getDefaultBundleName = requireHandler.getDefaultBundleName.bind(requireHandler);
                        }

                        if (additionalVars) {
                            defDependency._additionalVars = additionalVars;
                        }

                        if (requireHandler.object) {
                            // If true, then the module will not be wrapped inside a factory function
                            defDependency.object = true;
                        }

                        if (globalVars) {
                            defDependency.globals = globalVars;
                        }

                        // Pass along the createReadStream and the lastModified to the def dependency
                        defDependency.requireCreateReadStream = inspectResult.createReadStream;
                        defDependency.inspected = inspectResult;
                        defDependency.asyncBlocks = asyncBlocks;
                        defDependency.requireLastModified = inspectResult.lastModified;

                        deduper.addDependency(defKey, defDependency);
                    }

                    // Do we also need to add dependency to run the dependency?
                    if (run === true) {
                        const runKey = deduper.runKey(resolved.clientPath, wait);

                        if (!deduper.hasRun(runKey)) {
                            const runDependency = {
                                type: 'commonjs-run',
                                path: resolved.clientPath,
                                wait,
                                file: resolved.path
                            };

                            if (requireHandler.getDefaultBundleName) {
                                // A `virtualModule` object provided a
                                // `getDefaultBundleName` that we will use to
                                // create the run dependency.
                                runDependency.getDefaultBundleName = requireHandler.getDefaultBundleName.bind(requireHandler);
                            }

                            if (wait === false) {
                                runDependency.wait = false;
                            }

                            deduper.addDependency(runKey, runDependency);
                        }
                    }

                    if (asyncMeta) {
                        return {
                            dependencies,
                            async: asyncMeta,
                            dirname: nodePath.dirname(resolved.path),
                            filename: resolved.path
                        };
                    } else {
                        return dependencies;
                    }
                });
        }
    };
}

exports.create = create;
