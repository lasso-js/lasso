'use strict';

const nodePath = require('path');
const chai = require('chai');
chai.config.includeStack = true;
const fs = require('fs');
const inspect = require('../lib/require/util/inspect');

describe('lasso-require/util/inspect', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/inspect'),
        async function (dir, helpers) {
            const inputPath = nodePath.join(dir, 'input.js');
            const inputSrc = fs.readFileSync(inputPath, { encoding: 'utf8' });
            const inspected = inspect(inputSrc, { allowShortcircuit: false });
            helpers.compare(inspected, '.json');
        });
});
