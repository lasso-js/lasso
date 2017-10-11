const compatible = require('../env').compatible;

module.exports = compatible
    ? require('../src/browser-refresh')
    : require('../dist-compat/browser-refresh');
