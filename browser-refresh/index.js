var optimizer = require('../');

exports.enable = function(patterns) {
    if (!patterns) {
        return;
    }

    if (process.env.BROWSER_REFRESH_URL) {

        var modifiedEvent = 'optimizer.fileModified.' + patterns;

        process.send({
            type: 'browser-refresh.specialReload',
            patterns: patterns,
            modifiedEvent: modifiedEvent
        });

        process.on('message', function(m) {
            if (typeof m === 'object' && m.type === modifiedEvent) {
                optimizer.handleWatchedFileChanged(m.path);
            }
        });

    }
};