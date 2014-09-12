var raptorDust = require('raptor-dust');
var nodePath = require('path');
require('raptor-polyfill/string/startsWith');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'optimizer-page': {
            buildInput: function(chunk, context, bodies, params, renderContext) {
                var dirname = nodePath.dirname(context.templateName);

                var packagePath = params.packagePath;
                if (!packagePath) {
                    if (!params.dependencies) {
                        params.packagePath = nodePath.join(dirname, 'optimizer.json');
                    }
                } else if (packagePath.startsWith('.')) {
                    params.packagePath = nodePath.join(dirname, packagePath);
                }

                if (!params.name && !params.pageName) {
                    params.pageName = nodePath.basename(dirname);
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
