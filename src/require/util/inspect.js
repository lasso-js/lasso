const path = require('path');
const espree = require('espree');
const codeFrame = require('@babel/code-frame').default;
const estraverse = require('estraverse');
const ok = require('assert').ok;
const cwd = process.cwd();

const parseOpts = {
    range: true,
    sourceType: 'script',
    ecmaVersion: espree.latestEcmaVersion
};

const shortCircuitRegExp = /require\(|require\.resolve\(|.async\(|#async|process|Buffer/;

function isRequire(node) {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string';
}

function isRequireResolve(node) {
    return node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'require' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'resolve' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal';
}

function isRequireFor(node, moduleName) {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        node.arguments[0].value === moduleName;
}

function isRequireForAsyncLoader(node) {
    return isRequireFor(node, 'lasso-loader') ||
        isRequireFor(node, 'raptor-loader');
}

function isAsyncNode(node, scope) {
    if (!node.arguments || !node.arguments.length) {
        return false;
    }

    if (node.type !== 'CallExpression' ||
        node.callee.type !== 'MemberExpression' ||
        node.callee.property.type !== 'Identifier' ||
        node.callee.property.name !== 'async') {
        return false;
    }

    if (isRequireForAsyncLoader(node.callee.object)) {
        return true;
    }

    if (node.callee.object.type === 'Identifier' &&
        (scope[node.callee.object.name] === 'lasso-loader')) {
        return true;
    }

    return false;
}

function parseAsyncNode(node, scope) {
    if (!isAsyncNode(node, scope)) {
        return;
    }

    const args = node.arguments;
    const numArguments = args.length;
    if ((numArguments < 1) || (numArguments > 2)) {
        return;
    }

    const dependencies = [];
    let hasInlineDependencies = false;
    let packageIdProvided;
    const firstArg = args[0];

    // We only care if about the async calls if the first argument is an array
    if (numArguments === 2) {
        if (firstArg.type === 'ArrayExpression') {
            hasInlineDependencies = true;
            // call is something like:
            //     require('lasso-loader').async(['./dep1.js', './dep2.js'], callback)
            const elems = firstArg.elements;
            for (let i = 0; i < elems.length; i++) {
                dependencies.push(elems[i].value);
            }
        } else {
            // call is something like:
            //    require('lasso-loader').async('somePackageId', callback)
            //    require('lasso-loader').async(someVariable, callback)
            packageIdProvided = true;
        }
    }

    const callbackNode = args[numArguments - 1];

    const hasFunctionBody =
        (callbackNode.type === 'FunctionExpression') ||
        (callbackNode.type === 'FunctionDeclaration');

    return {
        node,
        requires: [],
        dependencies,
        args,
        callbackNode,

        // require('lasso-loader').async(packageId, function() {}) is used
        // then `packageIdProvided` will be `true`
        packageIdProvided,

        // Store the range of the first arg in case we need to replace
        // or add to it.
        firstArgRange: args[0].range,

        // If the first argument to require('lasso-loader').async([...], callback) is
        // is used then `hasInlineDependencies` will be `true`
        hasInlineDependencies,

        // If the last argument to require('lasso-loader').async(...)
        // is a `FunctionDeclaration` or `FunctionExpression` then
        // `hasFunctionBody` will be `true`.
        hasFunctionBody,

        toString: function() {
            return '[async: ' + this.name + ', dependencies=' + JSON.stringify(dependencies) + ']';
        }
    };
}

function recordGlobalsHelper(node, scope, foundGlobals) {
    if (!node || node.type !== 'Identifier') {
        return;
    }

    const id = node.name;

    if (id === 'require' ||
        id === 'exports' ||
        id === 'module' ||
        id === 'arguments' ||
        id === '__dirname' ||
        id === '__filename') {
        // We don't require about these "globals"
        return;
    }

    if (!scope[id]) {
        foundGlobals[id] = true;
    }
}

function recordGlobals(node, parentNode, scope, foundGlobals) {
    if (node.type === 'Identifier') {
        if (parentNode.type === 'MemberExpression' ||
            parentNode.type === 'Property' ||
            parentNode.type === 'VariableDeclarator' ||
            parentNode.type === 'FunctionDeclaration' ||
            parentNode.type === 'FunctionExpression') {
            return;
        }
        recordGlobalsHelper(node, scope, foundGlobals);
    } else if (node.type === 'MemberExpression') {
        if (parentNode !== 'MemberExpression') {
            recordGlobalsHelper(node.object, scope, foundGlobals);
        }
    } else if (node.type === 'Property') {
        recordGlobalsHelper(node.value, scope, foundGlobals);
    } else if (node.type === 'VariableDeclarator') {
        recordGlobalsHelper(node.init, scope, foundGlobals);
    } else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        if (node.type === 'FunctionDeclaration' && node.id) {
            delete foundGlobals[node.id.name];
        }

        // Skip the params and the function ID and just look at the body nodes
        node.body.body.forEach((bodyNode) => {
            recordGlobalsHelper(bodyNode, scope, foundGlobals);
        });
    }
}

module.exports = function inspect(src, options) {
    ok(src != null, 'src is requried');

    const allowShortcircuit = !options || options.allowShortcircuit !== false;

    if (allowShortcircuit && shortCircuitRegExp.test(src) === false) {
        // Nothing of interest so nothing to do
        return {
            requires: [],
            foundGlobals: {},
            asyncBlocks: []
        };
    }

    const requires = [];
    const scopeStack = [{}];
    const asyncScopeStack = [];
    const asyncStack = [];
    let curAsyncInfo = null;
    let asyncBlocks = [];
    const foundGlobals = {};

    let parsedAst;
    try {
        parsedAst = espree.parse(src, parseOpts);
    } catch (err) {
        if (!err.lineNumber) {
            throw err;
        }

        const filename = options && options.filename;
        let errorLoc = '(' + err.lineNumber + ',' + err.column + '): ';
        if (filename) {
            errorLoc = path.relative(cwd, filename) + errorLoc;
        }

        const frame = codeFrame(src, err.lineNumber, err.column, { highlightCode: true });
        throw new SyntaxError(errorLoc + err.message + '\n' + frame);
    }

    estraverse.traverse(parsedAst, {
        enter: function(node, parentNode) {
            let scope = scopeStack[scopeStack.length - 1];

            if (node.type === 'VariableDeclaration') {
                node.declarations.forEach(function(varDecl) {
                    if (varDecl.init && isRequireForAsyncLoader(varDecl.init)) {
                        scope[varDecl.id.name] = 'lasso-loader';
                    } else {
                        scope[varDecl.id.name] = true;
                    }
                });
            } else if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                scope = Object.create(scope);
                node.params.forEach((param) => {
                    scope[param.name] = true;
                });

                if (node.type === 'FunctionDeclaration') {
                    scopeStack[scopeStack.length - 1][node.id.name] = true;
                }

                scopeStack.push(scope);
            }

            recordGlobals(node, parentNode, scope, foundGlobals);

            let requirePath;

            if (!scope.require && (isRequire(node) || isRequireResolve(node))) {
                requirePath = node.arguments[0].value;

                const range = node.range;

                const firstArgRange = node.arguments[0].range;

                if (asyncScopeStack.length) {
                    // We are in the scope of an async callback function so this
                    // is a dependency that will be lazily loaded
                    if (requirePath !== 'lasso-loader' && requirePath !== 'raptor-loader') {
                        const lastAsyncInfo = asyncScopeStack[asyncScopeStack.length - 1];

                        lastAsyncInfo.requires.push({
                            path: requirePath,
                            range,
                            argRange: firstArgRange
                        });

                        lastAsyncInfo.dependencies.push({
                            type: 'require',
                            path: requirePath
                        });
                    }
                } else {
                    requires.push({
                        path: requirePath,
                        range,
                        argRange: firstArgRange
                    });
                }
            }

            let asyncInfo;
            if ((asyncInfo = parseAsyncNode(node, scopeStack[scopeStack.length - 1]))) {
                curAsyncInfo = asyncInfo;
                asyncBlocks.push(asyncInfo);
                asyncStack.push(asyncInfo);
            } else if (curAsyncInfo && node === curAsyncInfo.callbackNode) {
                // We are in the scope of the async callback function so
                // all dependencies below this will be async
                asyncScopeStack.push(curAsyncInfo);
                curAsyncInfo = null;
            }
        },

        leave: function(node, parentNode) {
            if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                scopeStack.pop();
            }

            if (asyncStack.length && node === asyncStack[asyncStack.length - 1].node) {
                asyncStack.pop();
            } else if (asyncScopeStack.length && node === asyncScopeStack[asyncScopeStack.length - 1].callbackNode) {
                asyncScopeStack.pop();
            }
        }
    });

    asyncBlocks = asyncBlocks.map((asyncBlock) => {
        delete asyncBlock.node;
        delete asyncBlock.args;
        delete asyncBlock.callbackNode;
        return asyncBlock;
    });

    return {
        requires,
        foundGlobals,
        asyncBlocks
    };
};
