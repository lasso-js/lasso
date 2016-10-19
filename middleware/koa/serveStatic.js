require('raptor-polyfill/string/startsWith');
require('raptor-polyfill/string/endsWith');

var lasso = require('../../');
var send = require('send');
var extend = require('raptor-util/extend');

function notFound() {
    this.error(404);
}

module.exports = function (options) {
    options = options || {};

    var myLasso = options.lasso || lasso.getDefaultLasso();
    var config = myLasso.config;

    var outputDir = config.outputDir;
    var urlPrefix = config.urlPrefix;
    var routePrefix = urlPrefix;
    if (!routePrefix.endsWith('/')) {
        routePrefix += '/';
    }

    if (!outputDir || !urlPrefix) {
        return function (req, res, next) {
            return next();
        };
    }

    var sendOptions = {
        fallthrough: false,
        redirect: false,
        index: false
    };

    if (options.sendOptions) {
        extend(sendOptions, options.sendOptions);
    }

    sendOptions.root = outputDir;

    return function* (next) {

        var ctx = this;

        var path = ctx.request.path;
        if (!path.startsWith(routePrefix) || (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD')) {
            return yield next;
        }

        ctx.respond = false;

        var filePath = path.substring(routePrefix.length);

        yield new Promise(function (resolve, reject) {
            send(ctx.req, filePath, sendOptions)
                .on('error', function(err) {
                    ctx.res.statusCode = err.statusCode || 500;
                    ctx.res.end('Not found: ' + filePath);
                    reject(err);
                })
                .on('directory', notFound)
                .on('headers', function(req, path, stat) {
                    ctx.status = 200;
                })
                .on('end', function() {
                    resolve();
                })
                .pipe(ctx.res);
        });
    };
};
