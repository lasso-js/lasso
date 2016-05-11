exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [
            require('./plugin')
        ]
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            './browser.json'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker, helpers) {
    var events = require('./plugin').events;
    var actual = helpers.normalizeOutput(events, { replaceVersions: true });
    helpers.compare(actual, '-events.json');
};