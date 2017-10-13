function requireNoOp(module, filename) { /* no-op */ }

function enableForExtension(extension) {
    if (extension == null) {
        return;
    }

    if (Array.isArray(extension)) {
        extension.forEach(enableForExtension);
        return;
    }

    if (typeof extension !== 'string') {
        throw new Error('Expected extension to be a string. Actual: ' + extension);
    }

    if (extension.charAt(0) !== '.') {
        extension = '.' + extension;
    }

    require.extensions[extension] = requireNoOp; // eslint-disable-line node/no-deprecated-api
}

exports.enable = function(extensions) {
    for (var i = 0; i < arguments.length; i++) {
        enableForExtension(arguments[i]);
    }
};
