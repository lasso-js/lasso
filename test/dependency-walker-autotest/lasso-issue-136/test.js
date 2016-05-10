exports.getFlags = function() {
    return ['foo'];
};

exports.getDependencies = function(dir) {
    return [
        dir + '/browser.json'
    ];
};