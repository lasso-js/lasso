const path = require('path');

exports.getTemplateData = function () {
    return {
        pageName: 'global-dependencies',
        $global: {
            dependencies: [
                {
                    type: 'css',
                    path: path.resolve(__dirname, './global-style.css')
                }
            ]
        }
    };
};
