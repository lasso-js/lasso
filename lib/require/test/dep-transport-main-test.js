'use strict';
var nodePath = require('path');
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var MockLassoContext = require('./mock/MockLassoContext');

describe('lasso-require/dep-transport-main' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dep-transport-main'),
        function (dir, helpers, done) {
            var main = require(nodePath.join(dir, 'test.js'));
            var dependencyProps = main.createDependency(dir);

            var pluginConfig = main.getPluginConfig ? main.getPluginConfig() : {};
            pluginConfig.rootDir = dir;

            var dependencyFactory = require('./mock/dependency-factory').create(pluginConfig);

            var dependency = dependencyFactory.depTransportMain(dependencyProps);

            var lassoContext = new MockLassoContext();

            dependency.init(lassoContext);

            return Promise.resolve()
                .then(() => {
                    return dependency.read(lassoContext);
                })
                .then((src) => {
                    helpers.compare(src, '.js');
                    done();
                })
                .catch(done);
        });
});