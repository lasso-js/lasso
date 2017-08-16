'use strict';

const nodePath = require('path');
const chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
const createLassoContext = require('./mock/create-lasso-context');
const moduleSearchPath = require('./util/module-search-path');
const normalizeOutput = require('./util/normalizeOutput');

describe('lasso-require/dep-transport-define' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dep-transport-define'),
        async function (dir, helpers) {
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

            var lassoContext = createLassoContext();

            dependency.init(lassoContext);

            let dependencies = await dependency.getDependencies(lassoContext);

            if (dependencies.dependencies) {
                dependencies = dependencies.dependencies;
            }

            let src;

            try {
                for (var i=0; i<dependencies.length; i++) {
                    var d = dependencies[i];
                    if (d.type === 'commonjs-def') {
                        var defDependency = dependencyFactory.depTransportDefine(d);
                        src = await defDependency.read(lassoContext);
                        break;
                    }
                }

                if (!src) {
                    throw new Error('commonjs-def dependency not found');
                }

                if (patchedSearchPath) {
                    patchedSearchPath.restore();
                }

                src = normalizeOutput(src, dir);
                helpers.compare(src, '.js');
            } catch (err) {
                if (patchedSearchPath) {
                    patchedSearchPath.restore();
                }
                throw err;
            }
        });
});
