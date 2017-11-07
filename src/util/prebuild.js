const nodePath = require('path');

exports.buildPrebuildFileName = function (file) {
    return `${file}.prebuild.json`;
};

exports.buildPrebuildName = function (pagePath) {
    const name = pagePath && nodePath.basename(pagePath);

    if (name) {
        const extLen = nodePath.extname(name).length;
        return (extLen && name.slice(0, 0 - extLen)) || name;
    }

    return 'page';
};
