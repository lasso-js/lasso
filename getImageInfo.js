const compatible = require('./env').compatible;

module.exports = compatible
    ? require('./src/plugins/lasso-image').getImageInfo
    : require('./dist-compat/plugins/lasso-image').getImageInfo;
