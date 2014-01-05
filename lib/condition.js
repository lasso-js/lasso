function fromExpression(condition) {
    return eval("(function(extensions) { return " + condition + ";})");    
}

function fromExtension(extension) {
    return function(extensions) {
        return extensions.contains(extension);
    };
}

exports.fromExpression = fromExpression;
exports.fromExtension = fromExtension;
