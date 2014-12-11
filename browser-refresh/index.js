var optimizer = require('../');

exports.enable = function(patterns) {
    if (!patterns) {
        patterns = "*.css *.less *.styl *.scss *.sass *.png *.jpeg *.jpg *.gif *.webp";
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