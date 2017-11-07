const nodePath = require('path');

exports.prebuildConfig = {
    pageName: 'test-page-1',
    dependencies: [nodePath.join(__dirname, 'a.js')],
    pageDir: __dirname
};
