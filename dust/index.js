var raptorDust = require('raptor-dust');
var nodePath = require('path');
require('raptor-ecma/es6');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'optimizer-page': {
            buildInput: function(chunk, context, bodies, params, renderContext) {
                var packagePath = params.packagePath;
                if (!packagePath) {
                    params.packagePath = nodePath.join(nodePath.dirname(context.templateName), 'optimizer.json');
                } else if (packagePath.startsWith('./')) {
                    params.packagePath = nodePath.join(nodePath.dirname(context.templateName), packagePath);
                }
                
                return params;

            },
            renderer: require('../taglib/page-tag')
        },
        'optimizer-slot': require('../taglib/slot-tag'),
        'optimizer-head': require('../taglib/head-tag'),
        'optimizer-body': require('../taglib/body-tag'),
        'optimizer-img': require('../taglib/img-tag')
    }, dust);
};