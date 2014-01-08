var ok = require('assert').ok;
var raptorPromises = require('raptor-promises');

exports.stream = false;

exports.contentType = 'application/javascript';

exports.filter = function(code, contentType, context) {
    ok(contentType === 'application/javascript', '"application/javascript" content type expected');

    var deferred = raptorPromises.defer();

    setTimeout(function() {
        deferred.resolve(code + '-JavaScriptFilter2Async');
    }, 200);

    return deferred.promise;
};

exports.name = module.id;