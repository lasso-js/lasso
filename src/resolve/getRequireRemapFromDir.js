const nodePath = require('path');

module.exports = function(fromDir, lassoContext) {
    const lassoJsonPath = nodePath.join(fromDir, 'browser.json');
    let remap;

    if (lassoContext.cachingFs.existsSync(lassoJsonPath)) {
        const lassoPackage = lassoContext.readPackageFile(lassoJsonPath);
        remap = lassoPackage.getRequireRemap(lassoContext);
    }

    return remap;
};
