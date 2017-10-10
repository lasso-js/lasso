const shelljs = require('shelljs');
const mkdir = shelljs.mkdir;
const rm = shelljs.rm;
const cp = shelljs.cp;
const path = require('path');
const fs = require('fs');
const babel = require('babel-core');
const mm = require('micromatch');

const rootDir = path.join(__dirname, '..');

function babelTransformFile(sourceFile, targetFile, babelOptions) {
    babelOptions = Object.assign({}, babelOptions);
    babelOptions.filename = sourceFile;
    var source = fs.readFileSync(sourceFile, 'utf-8');
    var transformed = babel.transform(source, babelOptions).code;

    fs.writeFileSync(targetFile, transformed, { encoding: 'utf8' });
}

function createMatcher(patterns) {
    var matchers = patterns.map((pattern) => {
        return mm.matcher(pattern);
    });

    return function isMatch(file) {
        for (var i = 0; i < matchers.length; i++) {
            if (matchers[i](file)) {
                return true;
            }
        }

        return false;
    };
}

function findFiles(dir, callback, isExcluded) {
    function findFilesHelper(parentDir, parentRelativePath) {
        var names = fs.readdirSync(parentDir);
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var file = path.join(parentDir, name);
            var relativePath = path.join(parentRelativePath, name);

            if (isExcluded && isExcluded(relativePath)) {
                continue;
            }

            var stat = fs.statSync(file);

            callback(file, relativePath, stat);

            if (stat.isDirectory()) {
                findFilesHelper(file, relativePath);
            }
        }
    }

    findFilesHelper(dir, '/');
}

exports.buildDir = function buildDir(sourceName, targetName, options) {
    const sourceDir = path.join(rootDir, sourceName);
    const distDir = path.join(rootDir, targetName);

    options = options || {};

    const babelOptions = options.babelOptions || {};

    var isExcluded;
    var isBabelExcluded;
    var isBabelIncluded;

    if (options.exclude) {
        isExcluded = createMatcher(options.exclude);
    }

    if (options.babelExclude) {
        isBabelExcluded = createMatcher(options.babelExclude);
    }

    if (options.babelInclude) {
        isBabelIncluded = createMatcher(options.babelInclude);
    }

    rm('-rf', distDir);

    findFiles(sourceDir, function(sourceFile, relativePath, stat) {
        var targetFile = path.join(distDir, relativePath);
        var targetDir = path.dirname(targetFile);

        if (stat.isFile()) {
            mkdir('-p', targetDir);

            var ext = path.extname(relativePath);
            if (ext !== '.js' ||
                ((isBabelExcluded && isBabelExcluded(relativePath)) && (!isBabelIncluded || !isBabelIncluded(relativePath)))) {
                cp(sourceFile, targetDir + '/');
            } else {
                babelTransformFile(sourceFile, targetFile, babelOptions);
            }
        }
    }, isExcluded);
};
