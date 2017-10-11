const compatible = require('../../env').compatible;

module.exports = compatible
    ? require('../../src/middleware/koa/serveStatic')
    : require('../../dist-compat/middleware/koa/serveStatic');
