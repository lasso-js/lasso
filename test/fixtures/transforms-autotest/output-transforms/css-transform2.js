exports.stream = false;

exports.transform = function(code, context) {
    var contentType = context.contentType;

    if (contentType === 'css') {
        return code.toUpperCase() + '-CSSTransform2';
    } else {
        return code;
    }
};

exports.name = module.id;