const lasso = require('../');
const send = require('send');
const extend = require('raptor-util/extend');

function notFound() {
    this.error(404);
}

module.exports = function(options) {
    options = options || {};

    const myLasso = options.lasso || lasso.getDefaultLasso();
    const config = myLasso.config;

    const outputDir = config.outputDir;
    const urlPrefix = config.urlPrefix;
    let routePrefix = urlPrefix;
    if (!routePrefix.endsWith('/')) {
        routePrefix += '/';
    }

    if (!outputDir || !urlPrefix) {
        return function(req, res, next) {
            return next();
        };
    }

    const sendOptions = {
        fallthrough: false,
        redirect: false,
        index: false
    };

    if (options.sendOptions) {
        extend(sendOptions, options.sendOptions);
    }

    sendOptions.root = outputDir;

    return function(ctx, next) {
        const req = ctx.request;
        const res = ctx.response;

        const path = req.path;
        if (!path.startsWith(routePrefix) || (req.method !== 'GET' && req.method !== 'HEAD')) {
            return next();
        }

        const filePath = path.substring(routePrefix.length);

        // create send stream
        const stream = send(req, filePath, sendOptions);

        // add directory handler
        stream.on('directory', notFound);

        // forward errors
        stream.on('error', function error(err) {
            res.statusCode = err.statusCode || 500;
            res.end('Not found: ' + filePath);
        });

        // pipe
        stream.pipe(res);
    };
};
