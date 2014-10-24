exports.ifCondition = function(condition) {
    return eval("(function(extensions) { return " + condition + ";})");
};

exports.ifExtension = function(extension) {
    return function(extensions) {
        return extensions.contains(extension);
    };
};

exports.ifNotExtension = function(extension) {
    return function(extensions) {
        return !extensions.contains(extension);
    };
};


exports.fromObject = function(o) {
    if (o['if']) {
        return exports.ifCondition(o['if']);
    } else if (o['if-extension']) {
        return exports.ifExtension(o['if-extension']);
    } else if (o['if-not-extension']) {
        return exports.ifNotExtension(o['if-not-extension']);
    }

    return null;
};