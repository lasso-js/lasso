var browserRefreshClient = require('browser-refresh-client');
var lasso = require('../');
var nodePath = require('path');

var styleExtensions = {
    css: true,
    less: true,
    styl: true,
    stylus: true,
    scss: true,
    sass: true
};

var imageExtensions = {
    png: true,
    jpeg: true,
    jpg: true,
    gif: true,
    svg: true
};

exports.enable = function(patterns) {
    if (!browserRefreshClient.isBrowserRefreshEnabled()) {
        return;
    }

    if (!patterns) {
        // Reasonable default with client-side only files...
        patterns = '*.css *.less *.styl *.scss *.sass *.png *.jpeg *.jpg *.gif *.webp *.svg';
    }

    browserRefreshClient
        .enableSpecialReload(patterns, { autoRefresh: false })
        .onFileModified(function(path) {
            lasso.handleWatchedFileChanged(path);

            var extname = nodePath.extname(path);
            if (extname) {
                extname = extname.substring(1);
            }

            if (imageExtensions[extname]) {
                console.log('[lasso/browser-refresh] Image modified: ' + path);
                browserRefreshClient.refreshImages();
            } else if (styleExtensions[extname]) {
                console.log('[lasso/browser-refresh] StyleSheet modified: ' + path);
                browserRefreshClient.refreshStyles();
            } else {
                console.log('[lasso/browser-refresh] File modified: ' + path);
                browserRefreshClient.refreshPage();
            }
        });
};