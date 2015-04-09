var Dependency = require('./Dependency');
var DependencyRegistry = require('./DependencyRegistry');

exports.Dependency = Dependency;
exports.DependencyRegistry = DependencyRegistry;

exports.createRegistry = function() {
    return new DependencyRegistry();
};

exports.isRegistry = function(o) {
    return o && o.__DependencyRegistry === true;
};

exports.isDependency = function(d) {
    return d && d.__Dependency === true;
};

exports.toString = function () {
    return '[lasso@' + __filename + ']';
};