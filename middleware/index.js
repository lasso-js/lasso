const compatible = require('../env').compatible;

module.exports = compatible
    ? require('../src/middleware')
    : require('../dist-compat/middleware');
