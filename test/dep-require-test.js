'use strict';

const nodePath = require('path');
const chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
const createLassoContext = require('./mock/create-lasso-context');
const normalizeOutput = require('./util/normalizeOutput');
const moduleSearchPath = require('./util/module-search-path');

const rootDir = nodePath.join(__dirname, '..');

describe('lasso-require/dependency-require' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dep-require'),
        async function (dir, helpers) {
            var main = require(nodePath.join(dir, 'test.js'));
            var pluginConfig = main.getPluginConfig ? main.getPluginConfig() : {};

            pluginConfig.rootDir = dir;

            var dependencyFactory = require('./mock/dependency-factory').create(pluginConfig);

            var patchedSearchPath;
            if (main.searchPath) {
                patchedSearchPath = moduleSearchPath.patchSearchPath(main.searchPath);
            }

            var dependencyDef = main.createDependency(dir);
            var dependency = dependencyFactory.depRequire(dependencyDef, dir);

            var lassoContext = createLassoContext();
            dependency.init(lassoContext);

            try {
                let dependencies = await dependency.getDependencies(lassoContext);
                dependencies = normalizeOutput(dependencies, rootDir);

                if (patchedSearchPath) {
                    patchedSearchPath.restore();
                }

                helpers.compare(dependencies, '.json');
            } catch (err) {
                if (patchedSearchPath) {
                    patchedSearchPath.restore();
                }
                throw err;
            }
        });
});
