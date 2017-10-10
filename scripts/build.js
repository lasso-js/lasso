'use strict';

const fs = require('fs');
const path = require('path');
const buildDir = require('./util').buildDir;

const target = process.argv[2];

const babelOptions = {
    presets: [
        ['env', {
            targets: {
                node: '6.9'
            },
            modules: false
        }]
    ]
};

let shouldBuildSrc = true;
let shouldBuildTest = true;

if (target === 'src') {
    shouldBuildTest = false;
}

if (shouldBuildSrc) {
    buildDir('src', 'dist-compat', { babelOptions });
}

fs.writeFileSync(
    path.join(__dirname, '../dist-compat/build.json'),
    JSON.stringify({ isDebug: false }, null, 4),
    { encoding: 'utf8' });

if (shouldBuildTest) {
    buildDir('test', 'test-dist-compat', {
        babelExclude: [
            '/autotests/**/*.js',
            '/build/**',
            '/static/**'
        ],
        babelInclude: [
            '/autotests/**/test.js',
            '/autotests/**/*plugin.js'
        ],
        exclude: [
            '*.skip',
            '/autotests/**/*actual*.*'
        ],
        babelOptions
    });
}
