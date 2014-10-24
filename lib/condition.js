exports.ifCondition = function(condition) {
    // This is a hack because we moved from "flags" to "extensions"
    // We create a function that introduces two scoped variables: flags, extensions
    var conditionFunc = eval("(function(flags, extensions) { return " + condition + ";})");

    return function(flags) {
        return conditionFunc(flags, flags);
    };
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
    var condition;

    if ((condition = o['if'])) {
        return exports.ifCondition(condition);
    } else if ((condition = o['if-flag'] || o['if-extension'])) {
        return exports.ifExtension(condition);
    } else if ((condition = o['if-not-flag'] || o['if-not-extension'])) {
        return exports.ifNotExtension(condition);
    }

    return null;
};