'use strict';
require('./util/test-init');

const nodePath = require('path');
const chai = require('chai');
const stripAnsi = require('strip-ansi');
chai.config.includeStack = true;
const fs = require('fs');
const inspect = require('lasso/require/util/inspect');

describe('lasso-require/util/inspect', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/inspect'),
        async function (dir, helpers) {
            const inputPath = nodePath.join(dir, 'input.js');
            const inputSrc = fs.readFileSync(inputPath, { encoding: 'utf8' });
            try {
                const inspected = inspect(inputSrc, { filename: inputPath, allowShortcircuit: false });
                helpers.compare(inspected, '.json');
            } catch (err) {
                var message = stripAnsi(err.message);
                message = message.slice(message.indexOf("): ") + 3);
                helpers.compare({
                    name: err.name,
                    message: message
                }, '.json');
            }
        });
});
