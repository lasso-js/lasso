var ExtensionSet = require('./ExtensionSet');

function isExtensionSet(o) {
    return o && o.__ExtensionSet;
}

function createExtensionSet(enabledExtensions) {
    return new ExtensionSet(enabledExtensions);
}

exports.isExtensionSet = isExtensionSet;
exports.createExtensionSet = createExtensionSet;