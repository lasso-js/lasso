const compatible = require('../env').compatible;

module.exports = compatible
    ? require('../src/middleware/serveStatic')
    : require('../dist-compat/middleware/serveStatic');
