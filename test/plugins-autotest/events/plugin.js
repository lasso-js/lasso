'use strict';

var events = [];
module.exports = exports = function(lasso, config) {
    lasso.on('beforeBuildPage', (event) => {
        var context = event.context;
        events.push('beforeBuildPage');

        context.on('beforeAddDependencyToSyncPageBundle', (event) => {
            var dependency = event.dependency;
            events.push('beforeAddDependencyToSyncPageBundle:' + dependency);
        });

        context.on('beforeAddDependencyToAsyncPageBundle', (event) => {
            var dependency = event.dependency;
            events.push('beforeAddDependencyToAsyncPageBundle:' + dependency);
        });
    });
};

exports.events = events;