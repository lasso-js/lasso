var promises = require('raptor-promises');

exports.filter = function(code, contentType, context) {
    if (contentType === 'application/javascript') {
        var deferred = promises.defer();
        setTimeout(function() {
            deferred.resolve(code + '-JavaScriptFilter2Async');
        }, 50);
        return deferred.promise;
    }
    else {
        return code;
    }
};

exports.name = module.id;
