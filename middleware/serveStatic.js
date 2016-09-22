require('raptor-polyfill/string/startsWith');
require('raptor-polyfill/string/endsWith');

var lasso = require('../');
var send = require('send');
var extend = require('raptor-util/extend');

function notFound() {
    this.error(404);
}

module.exports = function(options) {
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
        return function(req, res, next) {
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


    return function(arg1, arg2, arg3) {
        var req, res, next;
        
        if(arg3) { // express
            req = arg1;
            res = arg2;
            next = arg3;
        } else { // koa
            req = arg1.request;
            res = arg1.response;
            next = arg2;
        }
        
        var path = req.path;
        if (!path.startsWith(routePrefix) || (req.method !== 'GET' && req.method !== 'HEAD')) {
            return next();
        }

        var filePath = path.substring(routePrefix.length);

        // create send stream
        var stream = send(req, filePath, sendOptions);

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
