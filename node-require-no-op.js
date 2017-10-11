const compatible = require('./env').compatible;

module.exports = compatible
    ? require('./src/node-require-no-op')
    : require('./dist-compat/node-require-no-op');
