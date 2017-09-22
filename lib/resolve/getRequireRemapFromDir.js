var nodePath = require('path');

module.exports = function(fromDir, lassoContext) {
    var lassoJsonPath = nodePath.join(fromDir, 'browser.json');
    var remap;

    if (lassoContext.cachingFs.existsSync(lassoJsonPath)) {
        var lassoPackage = lassoContext.readPackageFile(lassoJsonPath);
        remap = lassoPackage.getRequireRemap(lassoContext);
    }

    return remap;
};
