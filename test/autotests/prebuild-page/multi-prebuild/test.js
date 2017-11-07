const nodePath = require('path');

exports.prebuildConfig = [
    {
        pageName: 'page',
        dependencies: [nodePath.join(__dirname, 'a.js')],
        pageDir: __dirname
    },
    {
        pageName: 'page1',
        dependencies: [nodePath.join(__dirname, 'b.js')],
        pageDir: __dirname
    }
];
