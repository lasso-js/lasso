const cssParser = require('raptor-css-parser');
const nodePath = require('path');
const lassoResolveFrom = require('lasso-resolve-from');

const REQUIRE_PREFIX = 'require:';

async function defaultUrlResolver (url, lassoContext) {
    if (url.indexOf('//') !== -1) {
        return url;
    }

    var queryStart = url.indexOf('?');
    var query;
    var target = url;

    if (queryStart !== -1) {
        query = url.substring(queryStart + 1);
        target = url.substring(0, queryStart);
    }

    if (target.charAt(0) === '/' && target.charAt(1) !== '/') {
        target = nodePath.join(lassoContext.getProjectRoot(), target);
    } else if (target.startsWith(REQUIRE_PREFIX)) {
        target = target.substring(REQUIRE_PREFIX.length).trim();

        var from;
        if (lassoContext.dependency) {
            from = lassoContext.dependency.getDir(lassoContext);
        } else {
            from = lassoContext.getProjectRoot();
        }

        var resolved = lassoResolveFrom(from, target);

        if (resolved) {
            target = resolved.path;
        } else {
            var err = new Error('Module not found: ' + target + ' (from: ' + from + ')');
            err.target = target;
            err.from = from;
            err.code = 'MODULE_NOT_FOUND';
            throw err;
        }
    }

    if (query) {
        // Add back the query string
        target += '?' + query;
    }

    return target;
}

function replaceUrls (code, lassoContext, urlResolver) {
    return new Promise((resolve, reject) => {
        const lasso = lassoContext.lasso;

        cssParser.replaceUrls(
            code,

            // the replacer function
            async function (url, start, end, callback) {
                try {
                    // add exception for css properies with hash e.g. behavior: url(#default#VML);
                    if (url.startsWith('#')) {
                        return callback(null, url);
                    }

                    const resolvedUrl = await urlResolver(url, lassoContext);
                    const bundledResource = await lasso.lassoResource(resolvedUrl, { lassoContext });
                    callback(null, bundledResource && bundledResource.url);
                } catch (err) {
                    callback(err);
                }
            },

            // when everything is done
            function (err, code) {
                return err ? reject(err) : resolve(code);
            });
    });
}

module.exports = function (lasso, pluginConfig) {
    const urlResolver = pluginConfig.urlResolver || defaultUrlResolver;

    lasso.addTransform({
        contentType: 'css',

        name: module.id,

        // true: The transform function will RECEIVE and RETURN a stream that can be used to read the transformed out
        // false: The transform function will RECEIVE full code and RETURN a value or promise
        stream: false,

        async transform (code, lassoContext) {
            var dependency = lassoContext.dependency;
            if (dependency && dependency.resolveCssUrlsEnabled === false) {
                return code;
            }

            return replaceUrls(code, lassoContext, urlResolver);
        }
    });
};
