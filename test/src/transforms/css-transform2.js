exports.stream = false;

exports.transform = function(code, contentType, context) {
    if (contentType === 'css') {
        return code.toUpperCase() + '-CSSTransform2';
    }
};

exports.name = module.id;