var browserRefreshClient = require('browser-refresh-client');
var optimizer = require('../');

exports.enable = function(patterns) {
    if (!browserRefreshClient.isBrowserRefreshEnabled()) {
        return;
    }

    if (!patterns) {
        // Reasonable default with client-side only files...
        patterns = '*.css *.less *.styl *.scss *.sass *.png *.jpeg *.jpg *.gif *.webp *.svg';
    }

    browserRefreshClient
        .enableSpecialReload(patterns)
        .onFileModified(function(path) {
            optimizer.handleWatchedFileChanged(path);
        });
};