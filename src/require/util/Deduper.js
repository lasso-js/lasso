const DeduperContext = require('./DeduperContext');
const ok = require('assert').ok;

const REQUIRE_DEDUPER_CONTEXT_KEY = 'dependency-require';
const hasOwn = Object.prototype.hasOwnProperty;

class Deduper {
    constructor(lassoContext, dependencies) {
        ok(lassoContext, '"lassoContext" is required');
        ok(dependencies, '"dependencies" is required');

        /*
         * NOTE: The use of "phaseData" was necessary because we want to keep a cache that is independent of
         * for each phase of the optimization process. The optimization is separated into phases such as "app-bundle-mappings",
         * "page-bundle-mappings", "async-page-bundle-mappings", etc. We use the "deduperContext" to prevent adding the same
         * require dependencies over and over again.
         */
        const deduperContext = lassoContext.phaseData[REQUIRE_DEDUPER_CONTEXT_KEY] ||
            (lassoContext.phaseData[REQUIRE_DEDUPER_CONTEXT_KEY] = new DeduperContext());

        this.dependencies = dependencies;

        this.deduperContext = deduperContext;

        const lookups = deduperContext.lookups;
        this.lookupDef = lookups.def;
        this.lookupRun = lookups.run;
        this.lookupInstalled = lookups.installed;
        this.lookupMain = lookups.main;
        this.lookupRemap = lookups.remap;
        this.lookupRequire = lookups.require;
        this.lookupBuiltin = lookups.builtin;
        this.lookupSearchPath = lookups.searchPath;
    }

    addDependency(key, d) {
        this.lookupDef[key] = true;
        this.dependencies.push(d);
    }

    // Define
    defKey(path) {
        return path;
    }

    hasDef(key) {
        return hasOwn.call(this.lookupDef, key);
    }

    // Run
    runKey(path, wait) {
        return wait ? path : path + '|nowait';
    }

    hasRun(key) {
        return hasOwn.call(this.lookupRun, key);
    }

    // Installed
    installedKey(parentPath, childName, childVersion) {
        return parentPath + '|' + childName + '|' + childVersion;
    }

    hasInstalled(key) {
        return hasOwn.call(this.lookupInstalled, key);
    }

    // Main
    mainKey(dir, main) {
        return dir + '|' + main;
    }

    hasMain(key) {
        return hasOwn.call(this.lookupMain, key);
    }

    // Remap
    remapKey(from, to) {
        return from + '|' + to;
    }

    hasRemap(key) {
        return hasOwn.call(this.lookupRemap, key);
    }

    // Require
    requireKey(path, from, run, wait) {
        let key = path + '@' + from;
        if (run) {
            key += '|run|' + wait;
        }
        return key;
    }

    hasRequire(key) {
        return hasOwn.call(this.lookupRequire, key);
    }

    // Builtin
    builtinKey(name, target) {
        return name + '>' + target;
    }

    hasBuiltin(key) {
        return hasOwn.call(this.lookupBuiltin, key);
    }

    // Search path
    searchPathKey(path) {
        return path;
    }

    hasSearchPath(key) {
        return hasOwn.call(this.lookupSearchPath, key);
    }

    addRuntime(runtimeDependency) {
        if (this.deduperContext.runtimeInclude === false) {
            this.dependencies.push(runtimeDependency);
            this.deduperContext.runtimeInclude = true;
        }
    }

    addReady(readyDependency) {
        if (this.deduperContext.readyIncluded === false) {
            // Add a dependency that will trigger all of the deferred
            // run modules to run once all of the code has been loaded
            // for the page
            this.dependencies.push(readyDependency);
            this.deduperContext.readyIncluded = true;
        }
    }

    addProcess(d) {
        if (this.deduperContext.processIncluded === false) {
            this.dependencies.push(d);
            this.deduperContext.processIncluded = true;
        }
    }
}

module.exports = Deduper;
