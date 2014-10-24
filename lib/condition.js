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
