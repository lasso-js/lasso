const compatible = require('../../env').compatible;
const fs = require('fs');
const nodePath = require('path');

const Module = require('module').Module;
const oldResolveFilename = Module._resolveFilename;

const rootDir = nodePath.join(__dirname, '../../');
const lassoDir = compatible
    ? nodePath.join(rootDir, 'src')
    : nodePath.join(rootDir, 'dist-compat');

const lassoInstalledDir = nodePath.join(rootDir, 'node_modules/lasso');

if (fs.existsSync(lassoInstalledDir)) {
    fs.renameSync(lassoInstalledDir, nodePath.join(rootDir, 'node_modules/~lasso'));
}

function buildPath (request, beginPath) {
    return nodePath.join(beginPath, request.substring('lasso/'.length));
}

Module._resolveFilename = function(request, parent, isMain) {
    if (request.charAt(0) !== '.') {
        if (request === 'lasso/node-require-no-op' ||
            request.startsWith('lasso/dist-compat/') ||
            request.startsWith('lasso/src') ||
            request.startsWith('lasso/middleware') ||
            request.startsWith('lasso/browser-refresh')) {
            request = buildPath(request, rootDir);
        } else if (request === 'lasso') {
            request = rootDir;
        } else if (request.startsWith('lasso/')) {
            request = buildPath(request, lassoDir);
        }
    }

    return oldResolveFilename.call(this, request, parent, isMain);
};
