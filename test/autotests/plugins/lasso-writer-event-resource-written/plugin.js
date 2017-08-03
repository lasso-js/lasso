'use strict';

var events = [];

module.exports = exports = function(lasso, config) {
    lasso.on('beforeBuildPage', (event) => {
        var context = event.context;

        context.writer.on('resourceWritten', event => {
            const correctSourceFile = event.sourceFile.endsWith('/test/autotests/plugins/lasso-writer-event-resource-written/fonts/Aleo-Regular.woff');
            const correctOutputFile = event.outputFile.endsWith('/test/build/plugins-lasso-writer-event-resource-written/plugins-lasso-writer-event-resource-written/autotest$0.0.0/fonts/Aleo-Regular.woff');

            events.push({
                url: event.url,
                sourceFile: correctSourceFile,
                outputFile: correctOutputFile
            });
        });
    });
};

exports.events = events;
