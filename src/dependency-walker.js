const EventEmitter = require('events').EventEmitter;
const forEachEntry = require('raptor-util/forEachEntry');
const perfLogger = require('raptor-logging').logger('lasso/perf');
const logger = require('raptor-logging').logger(module);
const createError = require('raptor-util/createError');

/**
 * Helper method to walk all dependencies recursively
 *
 * @param options
 */
async function walk(options) {
    const startTime = Date.now();
    const emitter = new EventEmitter();
    const lassoContext = options.lassoContext || {};
    const flags = lassoContext.flags;
    const shouldSkipDependencyFunc = options.shouldSkipDependency;

    const walkContext = {
        lassoContext
    };

    const on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });

    const foundDependencies = {};

    async function walkDependencies (dependencies, parentDependency, jsSlot, cssSlot, dependencyChain) {
        logger.debug('walkDependencies', dependencies);

        for (const dependency of dependencies) {
            await walkDependency(dependency,
                parentDependency,
                jsSlot,
                cssSlot,
                dependencyChain);
        }
    }

    async function walkManifest(manifest, parentDependency, jsSlot, cssSlot, dependencyChain) {
        delete walkContext.dependency;
        walkContext.package = manifest;
        walkContext.dependencyChain = dependencyChain;
        emitter.emit('manifest', manifest, walkContext, parentDependency);

        logger.debug('walkManifest', manifest);

        const dependencies = await manifest.getDependencies({
            flags,
            lassoContext: options.lassoContext
        });

        logger.debug('walkManifest - dependencies', dependencies);
        await walkDependencies(dependencies, parentDependency, jsSlot, cssSlot, dependencyChain);
    }

    async function walkDependency(dependency, parentDependency, jsSlot, cssSlot, dependencyChain) {
        dependencyChain = dependencyChain.concat(dependency);

        await dependency.init(lassoContext);

        logger.debug('dependency init', dependency);

        if (dependency._condition && !dependency._condition(flags)) {
            return;
        }

        const key = await dependency.calculateKey(lassoContext);

        if (foundDependencies[key]) {
            return;
        }

        foundDependencies[key] = true;

        let slot;

        if (!dependency.isPackageDependency()) {
            slot = dependency.getSlot();
            if (!slot) {
                if (dependency.isJavaScript()) {
                    slot = jsSlot || 'body';
                } else {
                    slot = cssSlot || 'head';
                }
            }
        }

        walkContext.slot = slot;
        delete walkContext.package;
        walkContext.dependency = dependency;
        walkContext.parentDependency = parentDependency;
        walkContext.dependencyChain = dependencyChain;

        if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency, walkContext)) {
            return;
        }

        emitter.emit('dependency', dependency, walkContext);

        if (dependency.isPackageDependency()) {
            try {
                const dependencyManifest = await dependency.getPackageManifest(lassoContext);

                if (!dependencyManifest) {
                    return;
                }

                await walkManifest(
                    dependencyManifest,
                    dependency,
                    dependency.getJavaScriptSlot() || jsSlot,
                    dependency.getStyleSheetSlot() || cssSlot,
                    dependencyChain);
            } catch (err) {
                const message = 'Failed to walk dependency ' + dependency + '. Dependency chain: ' + dependencyChain.join(' → ') + '. Cause: ' + err;
                throw createError(message, err);
            }
        }
    }

    function done () {
        perfLogger.debug('Completed walk in ' + (Date.now() - startTime) + 'ms');
        emitter.emit('end');
    }

    const dependencyChain = [];

    if (options.lassoManifest) {
        await walkManifest(
            options.lassoManifest,
            null, // parent package
            null, // jsSlot
            null,
            dependencyChain);
        done();
    } else if (options.dependency) {
        await walkDependency(
            options.dependency,
            null, // parent package
            null, // jsSlot
            null,
            dependencyChain);
        done();
    } else if (options.dependencies) {
        const dependencies = await options.dependencies.normalize();
        await walkDependencies(
            dependencies,
            null,
            null,
            null,
            dependencyChain);
        done();
    } else {
        throw new Error('"lassoManifest", "dependency", "dependencies" is required');
    }
}

exports.walk = walk;
