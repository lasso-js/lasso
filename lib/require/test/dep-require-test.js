'use strict';


var nodePath = require('path');
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var MockLassoContext = require('./mock/MockLassoContext');
var normalizeOutput = require('./util/normalizeOutput');
var moduleSearchPath = require('./util/module-search-path');

var rootDir = nodePath.join(__dirname, '..');

describe('lasso-require/dependency-require' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dep-require'),
        function (dir, helpers, done) {

            var main = require(nodePath.join(dir, 'test.js'));

            var pluginConfig = main.getPluginConfig ? main.getPluginConfig() : {};
            pluginConfig.rootDir = dir;

            var dependencyFactory = require('./mock/dependency-factory').create(pluginConfig);

            var patchedSearchPath;
            if (main.searchPath) {
                patchedSearchPath = moduleSearchPath.patchSearchPath(main.searchPath);
            }

            var dependencyDef = main.createDependency(dir);
            var dependency = dependencyFactory.depRequire(dependencyDef);

            var lassoContext = new MockLassoContext();
            dependency.init(lassoContext);

            return Promise.resolve()
                .then(() => {
                    return dependency.getDependencies(lassoContext);
                })
                .then((dependencies) => {
                    dependencies = normalizeOutput(dependencies, rootDir);
                    if (patchedSearchPath) {
                        patchedSearchPath.restore();
                    }

                    helpers.compare(dependencies, '.json');
                    done();
                })
                .catch((err) => {
                    if (patchedSearchPath) {
                        patchedSearchPath.restore();
                    }
                    done(err);
                });
        });

});