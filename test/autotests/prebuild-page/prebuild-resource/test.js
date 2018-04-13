const nodePath = require('path');

exports.prebuildConfig = {
    pageName: 'test-page',
    dependencies: [ nodePath.join(__dirname, 'ebay.png') ],
    pageDir: __dirname
};
