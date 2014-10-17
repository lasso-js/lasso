var ok = require('assert').ok;
var raptorPromises = require('raptor-promises');

exports.stream = false;

exports.contentType = 'js';

exports.transform = function(code, context) {
    var contentType = context.contentType;
    ok(contentType === 'js', '"js" content type expected');

    var deferred = raptorPromises.defer();

    setTimeout(function() {
        deferred.resolve(code + '-JavaScriptTransform2Async');
    }, 100);

    return deferred.promise;
};

exports.name = module.id;