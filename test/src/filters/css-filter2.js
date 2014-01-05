exports.filter = function(code, contentType, context) {
    if (contentType === 'text/css') {
        return code + '-CSSFilter2';
    }
};

exports.name = module.id;