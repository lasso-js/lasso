'use strict';

var events = [];
module.exports = exports = function(lasso, config) {
    lasso.on('beforeBuildPage', (event) => {
        var context = event.context;

        context.on('beforeAddDependencyToSyncPageBundle', (event) => {
            var dependency = event.dependency;

            if (event.slot === 'my-inline-slot') {
                dependency.inline = true;
            }
        });
    });
};

exports.events = events;