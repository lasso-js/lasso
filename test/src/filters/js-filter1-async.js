var promises = require('raptor-promises');

exports.filter = function(code, contentType, context) {
    if (!code) {
        throw new Error('code expected');
    }
    
    if (contentType === 'application/javascript') {
        var deferred = promises.defer();
        setTimeout(function() {
            deferred.resolve(code + '-JavaScriptFilter1Async');
        }, 200);
        return deferred.promise;
    }
    else {
        return code;
    }
};

exports.name = module.id;