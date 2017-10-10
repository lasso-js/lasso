const compatible = require('./env').compatible;

module.exports = compatible
    ? require('./src')
    : require('./dist-compat');
