var path = require('path');
var fs = require('fs');
var raptorPromises = require('raptor-promises');

var cache = {};

exports.forFile = function(filePath, callback) {
    // we use the last modified time of the directory (instead of checking individual files)
    var dirname = path.dirname(filePath);

    var cacheEntry;
    if ((cacheEntry = cache[dirname]) !== undefined) {
        if (cacheEntry.then === undefined) {
            // cache entry is not a promise (it's the actual timestamp)
            if (callback) {
                // invoke the callbakc with the timestamp
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

        console.log(module.id, 'cache hit', dirname.grey);
        return;
    }

    var deferred = raptorPromises.defer();
    var promise;

    // cache the promise
    cache[dirname] = promise = deferred.promise;

    // var ts = Date.now();
    fs.stat(dirname, function(err, stat) {
        var timestamp;

        // cache the actual timestamp (replace the promise)
        cache[dirname] = timestamp = stat && stat.mtime ? stat.mtime.getTime() : -1;

        // resolve the promise
        deferred.resolve(timestamp);

        // console.log(module.id, 'last-modified'.magenta, Date.now() - ts, 'ms', dirname.grey);
    });

    if (callback) {
        deferred.promise.then(function(timestamp) {
            callback(null, timestamp);
        });
        
    } else {
        return promise;
    }
};