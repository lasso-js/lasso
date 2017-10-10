var lassoModulesClientTransport = require('lasso-modules-client/transport');

function normalizeFSPath(path) {
    return lassoModulesClientTransport.getClientPath(path);
}

module.exports = normalizeFSPath;
