require('raptor-polyfill/string/endsWith');

var ok = require('assert').ok;
var nodePath = require('path');
var Module = require('module').Module;
var fs = require('fs');
var jsonminify = require('jsonminify');

var resolveCache = {};
var manifestCache = {};
var isAbsolute = require('./path').isAbsolute;

var allowedProps = {
    dependencies: true,
    async: true,
    main: true,
    requireRemap: true
};

function readManifest(path) {
    var manifest = manifestCache[path];
    if (manifest !== undefined) {
        return manifest;
    }

    var json;

    try {
        json = fs.readFileSync(path, {encoding: 'utf8'});
    }
    catch(e) {
        manifest = null;
    }

    if (json) {
        try {
            manifest = JSON.parse(jsonminify(json));
        } catch(e) {
            throw new Error('Unable to parse JSON file at path "' + path + '". Exception: ' + e);
        }


        for (var k in manifest) {
            if (manifest.hasOwnProperty(k)) {
                if (!allowedProps[k]) {
                    throw new Error('Invalid property of "' + k + '" in lasso manifest at path "' + path + '"');
                }
            }
        }

        if (manifest.main && manifest.dependencies) {
            throw new Error('"dependencies" not allowed when "main specified. Lasso.js manifest file: ' + path);
        }

        manifest.dirname = nodePath.dirname(path);
        manifest.filename = path;
    }

    manifestCache[path] = manifest;
    return manifest;
}

function tryManifest(dirname, manifestPath) {
    var manifest = readManifest(nodePath.resolve(dirname, manifestPath, 'browser.json'));
    if (!manifest) {
        manifest = readManifest(nodePath.resolve(dirname, manifestPath, 'optimizer.json'));
    }
    return manifest;
}

function tryExtensionManifest(dirname, manifestPath) {
    var manifest = readManifest(nodePath.resolve(dirname, manifestPath + '.browser.json'));
    if (!manifest) {
        manifest = readManifest(nodePath.resolve(dirname, manifestPath + '.optimizer.json'));
    }
    return manifest;
}

function tryQualified(dirname, manifestPath) {
    var path = nodePath.resolve(dirname, manifestPath);
    return readManifest(path);
}

function tryAll(dirname, manifestPath) {
    if (manifestPath.endsWith('browser.json') || manifestPath.endsWith('optimizer.json')) {
        return tryQualified(dirname, manifestPath);         // <dirname>/<manifestPath>/browser.json
    } else {
        return tryManifest(dirname, manifestPath) ||         // <dirname>/<manifestPath>/browser.json
            tryExtensionManifest(dirname, manifestPath);        // <dirname>/<manifestPath>.browser.json
    }
}

function _resolve(path, from) {

    if (isAbsolute(path)) {
        return tryAll(from, path);
    }

    if (!from) {
        throw new Error('"from" argument is required for non-absolute paths');
    }

    var resolveKey = path + '|' + from;
    var manifest = resolveCache[resolveKey];

    if (manifest !== undefined) {
        return manifest;
    }

    if (process.platform === 'win32') {
        path = path.replace(/\\/g, '/'); // Replace back slashes with forward slashes
    }

    if (path.startsWith('./') || path.startsWith('../')) {
        // Don't go through the search paths for relative paths
        manifest = tryAll(from, path);
    }
    else {
        var paths = Module._nodeModulePaths(from);

        for (var i=0, len=paths.length; i<len; i++) {
            var dir = paths[i];

            manifest = tryAll(dir, path);

            if (manifest) {
                break;
            }
        }
    }

    resolveCache[resolveKey] = manifest;

    return manifest;
}

function load(path, from) {

    ok(path, '"path" is required');
    ok(typeof path === 'string', '"path" must be a string');

    // ok(from, '"from" is required');
    // ok(typeof from === 'string', '"from" must be a string');

    // Load the lasso manifest and automatically follow "main"
    // to get the destination lasso package
    function loadHelper(path, from) {
        var manifest = _resolve(path, from);
        if (!manifest) {
            var e = new Error('Lasso manifest not found: ' + path + '(searching from: ' + from + ')');
            e.fileNotFound = path + '@' + from;
            throw e;
        }

        if (manifest.main) {
            var mainPath = nodePath.resolve(manifest.dirname, manifest.main);
            return loadHelper(mainPath, manifest.dirname);
        }
        else {
            return manifest;
        }
    }

    return loadHelper(path, from);
}

exports.load = load;

exports.toString = function () {
    return '[lasso@' + __filename + ']';
};
