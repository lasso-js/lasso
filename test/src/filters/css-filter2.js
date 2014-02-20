exports.stream = false;

exports.filter = function(code, contentType, context) {
    if (contentType === 'css') {
        return code.toUpperCase() + '-CSSFilter2';
    }
};

exports.name = module.id;