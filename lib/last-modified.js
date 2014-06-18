var fs = require('fs');
var raptorPromises = require('raptor-promises');

var cache = {};

exports.forFile = function(filePath, callback) {
    var cacheEntry;
    if ((cacheEntry = cache[filePath]) !== undefined) {
        if (cacheEntry.then === undefined) {
            // cache entry is not a promise (it's the actual timestamp)
            if (callback) {
                // invoke the callback with the timestamp
                callback(null, cacheEntry);
            } else {
                // return a resolved promise
                return raptorPromises.resolved(cacheEntry);
            }
        } else {
            if (callback) {
                // chain the callback to the promise
                cacheEntry.then(function(timestamp) {
                    callback(null, timestamp);
                });
            } else {
                // return the promise
                return cacheEntry;
            }
        }
        
        return;
    }

    var deferred = raptorPromises.defer();
    var promise;

    // cache the promise
    cache[filePath] = promise = deferred.promise;

    // var ts = Date.now();
    fs.stat(filePath, function(err, stat) {
        var timestamp;

        // cache the actual timestamp (replace the promise)
        cache[filePath] = timestamp = stat && stat.mtime ? stat.mtime.getTime() : -1;

        // resolve the promise
        deferred.resolve(timestamp);
    });

    if (callback) {
        deferred.promise.then(function(timestamp) {
            callback(null, timestamp);
        });
        
    } else {
        return promise;
    }
};