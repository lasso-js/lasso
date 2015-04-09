var raptorDust = require('raptor-dust');
var nodePath = require('path');
require('raptor-polyfill/string/startsWith');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'lasso-page': {
            buildInput: function(chunk, context, bodies, params, renderContext) {
                var dirname = nodePath.dirname(context.templateName);

                var packagePath = params.packagePath;
                if (!packagePath) {
                    if (!params.dependencies) {
                        params.packagePath = nodePath.join(dirname, 'browser.json');
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
        'lasso-slot': require('../taglib/slot-tag'),
        'lasso-head': require('../taglib/head-tag'),
        'lasso-body': require('../taglib/body-tag'),
        'lasso-img': require('../taglib/img-tag')
    }, dust);
};
