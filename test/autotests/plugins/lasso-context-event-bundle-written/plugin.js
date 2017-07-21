'use strict';

var events = [];

module.exports = exports = function(lasso, config) {
    lasso.on('beforeBuildPage', (event) => {
        var context = event.context;

        context.on('bundleWritten', (event) => {
            events.push(event.bundle.name);
        });
    });
};

exports.events = events;
