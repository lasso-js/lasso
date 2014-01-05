exports.filter = function(code, contentType, context) {
    if (contentType === 'text/css') {
        return code + '-CSSFilter1';
    }
};

exports.name = module.id;