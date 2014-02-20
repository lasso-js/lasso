var parser = require("uglify-js").parser;
var uglify = require("uglify-js").uglify;

function minify(src, options) {
    if (!options) {
        options = {};
    }
    
    var ast = parser.parse(src, options.strict_semicolons === true);
    
    if (options.lift_variables === true) {
        ast = uglify.ast_lift_variables(ast);
    }
    
    ast = uglify.ast_mangle(ast, options);
    ast = uglify.ast_squeeze(ast, options);
    return uglify.gen_code(ast);
}

module.exports = {
    contentType: 'js',

    name: module.id,

    stream: false,

    filter: function(code, contentType, dependency, bundle) {
        if (code && contentType === 'js') {
            var minified = minify(code);
            if (minified.length && !minified.endsWith(";")) {
                minified += ";";
            }
            return minified;
        }
        else {
            return code;
        }
    }
};