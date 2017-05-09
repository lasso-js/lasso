'use strict';

var nodePath = require('path');
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var MockLassoContext = require('./mock/MockLassoContext');
var moduleSearchPath = require('./util/module-search-path');
var normalizeOutput = require('./util/normalizeOutput');

describe('lasso-require/dep-transport-define' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dep-transport-define'),
        function (dir, helpers, done) {
            var main = require(nodePath.join(dir, 'test.js'));
            var dependencyProps = main.createDependency(dir);

            var patchedSearchPath;
            if (main.searchPath) {
                patchedSearchPath = moduleSearchPath.patchSearchPath(main.searchPath);
            }

            var pluginConfig = main.getPluginConfig ? main.getPluginConfig() : {};
            pluginConfig.rootDir = dir;

            var dependencyFactory = require('./mock/dependency-factory').create(pluginConfig);

            var dependency = dependencyFactory.depRequire(dependencyProps);

            var lassoContext = new MockLassoContext();

            dependency.init(lassoContext);

            return Promise.resolve()
                .then(() => {
                    return dependency.getDependencies(lassoContext);
                })
                .then((dependencies) => {
                    if (dependencies.dependencies) {
                        dependencies = dependencies.dependencies;
                    }

                    for (var i=0; i<dependencies.length; i++) {
                        var d = dependencies[i];
                        if (d.type === 'commonjs-def') {
                            var defDependency = dependencyFactory.depTransportDefine(d);
                            return defDependency.read(lassoContext);
                        }
                    }
                    throw new Error('commonjs-def dependency not found');
                })
                .then((src) => {
                    if (patchedSearchPath) {
                        patchedSearchPath.restore();
                    }
                    src = normalizeOutput(src, dir);

                    helpers.compare(src, '.js');
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