require('raptor-polyfill/string/startsWith');

var ok = require('assert').ok;
var nodePath = require('path');
var streamToString = require('./util/streamToString');
var transport = require('lasso-modules-client/transport');
var StringTransformer = require('./util/StringTransformer');

function shouldPreresolvePath(path) {
    return true;
    // if (path.indexOf('$') !== -1) {
    //     // If the require path has a special "$" character then
    //     // we must replace with the preresolved path to avoid
    //     // problems.
    //     return true;
    // }
    //
    // if (path.indexOf('node_modules') !== -1) {
    //     // If the require path includes a "node_modules" directory in the path then
    //     // preresolve since we normalize "node_modules" to "$"
    //     return true;
    // }
    //
    //
    // if (path.charAt(0) === '.') {
    //     return false;
    // }
    //
    // return true;
}

function preresolvePath(require, stringTransformer) {
    if (!require.argRange) {
        // Can't preresolve the require if we don't know where it is in the string...
        return;
    }

    var resolved = require.resolved;

    if (shouldPreresolvePath(require.path)) {
        stringTransformer.comment(require.argRange);
        stringTransformer.insert(require.argRange[0], '\'' + resolved.clientPath + '\'');
    }
}

function transformRequires(code, inspected, asyncBlocks, lassoContext) {
    // We have two goals with this function:
    // 1) Comment out all non-JavaScript module requires
    //    require('./test.css'); --> /*require('./test.css');*/
    // 2) Update the first argument for all require('lasso-loader').async(...) calls
    //
    // In addition, we want to *maintain line numbers* for the transformed code to be nice!

    var stringTransformer = new StringTransformer();

    function transformRequire(require) {
        ok(require.resolved, '"require.resolved" expected');

        if (require.resolved.voidRemap) {
            if (require.range) {
                stringTransformer.comment(require.range);
                stringTransformer.insert(require.range[0], '({})');
            }
            return;
        }

        var resolved = require.resolved;

        if (!resolved.isDir && (resolved.type || !lassoContext.dependencyRegistry.getRequireHandler(resolved.path, lassoContext))) {
            if (require.range) {
                stringTransformer.comment(require.range);
                stringTransformer.insert(require.range[0], 'void 0');
            }
        } else {
            preresolvePath(require, stringTransformer);
        }
    }

    function transformAsyncCall(asyncBlock) {
        var name = asyncBlock.name;

        var firstArgRange = asyncBlock.firstArgRange;

        if (asyncBlock.packageIdProvided) {
            // If `name` is not provided then it means that there was no
            // function body so there is no auto-generated async meta name.
            if (name) {
                var packageIdExpression = code.substring(asyncBlock.firstArgRange[0], asyncBlock.firstArgRange[1]);

                // This path is taken when when async is called no arguments:
                // For example:
                // require('lasso-loader').async(blah, function() {...});
                stringTransformer.comment(firstArgRange);
                stringTransformer.insert(firstArgRange[0],
                    '[' + JSON.stringify(name) + ',' + packageIdExpression + ']');
            }
        } else if (asyncBlock.hasInlineDependencies) {
            ok(name, '"asyncBlock.name" required');
            // This path is taken when when async is called with
            // array of dependencies.
            // For example:
            // require('lasso-loader').async(['./a.js', './b.js'], function() {...});
            stringTransformer.comment(firstArgRange);
            stringTransformer.insert(firstArgRange[0], JSON.stringify(name));
        } else {
            ok(name, '"asyncBlock.name" required');
            // This path is taken when when async is called no arguments:
            // For example:
            // require('lasso-loader').async(function() {...});
            stringTransformer.insert(firstArgRange[0], JSON.stringify(name) + ', ');
        }
    }

    if (asyncBlocks && asyncBlocks.length) {
        asyncBlocks.forEach(transformAsyncCall);
    }

    inspected.allRequires.forEach(transformRequire);

    return stringTransformer.transform(code);
}

exports.create = function(config, lasso) {
    return {
        properties: {
            'path': 'string',
            'file': 'file',
            'globals': 'string',
            'wait': 'boolean',
            'object': 'boolean',
            'inspected': 'object',
            'requireCreateReadStream': 'function',
            'requireLastModified': 'function',
            'asyncBlocks': 'array'
        },

        getDir: function() {
            return nodePath.dirname(this.file);
        },

        getSourceFile: function() {
            return this.file;
        },

        read: function(lassoContext) {
            var requireCreateReadStream = this.requireCreateReadStream;
            var requireInspected = this.inspected;
            var asyncBlocks = this.asyncBlocks;
            var isObject = this.object;
            var globals = this.globals;
            var path = this.path;
            var additionalVars = this._additionalVars;

            ok(requireCreateReadStream, '"requireCreateReadStream" is required');
            ok(requireInspected, '"requireInspected" is required');
            ok(path, '"path" is required');

            var stream = requireCreateReadStream();

            return streamToString(stream)
                .then((code) => {
                    if (isObject) {
                        return transport.codeGenerators.define(path, code, {
                            object: true,
                            modulesRuntimeGlobal: config.modulesRuntimeGlobal
                        });
                    } else {
                        var transformedCode = transformRequires(code, requireInspected, asyncBlocks, lassoContext);

                        var defCode = transport.codeGenerators.define(
                            path,
                            transformedCode,
                            {
                                additionalVars: additionalVars,
                                globals: globals,
                                modulesRuntimeGlobal: config.modulesRuntimeGlobal
                            });

                        return defCode;
                    }
                });
        },

        async getLastModified (lassoContext) {
            return this.requireLastModified;
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getUnbundledTarget(lassoContext) {
            return this.path;
        },

        calculateKey () {
            return 'modules-define:' + this.path;
        },

        toString() {
            return `[commonjs-def: path="${this.path}"]`;
        }
    };
};
