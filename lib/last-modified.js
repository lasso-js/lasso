var fs = require('fs');
var DataHolder = require('raptor-async/DataHolder');

var cache = {};

exports.forFile = function(filePath, callback) {
    
    var dataHolder = cache[filePath];
    if (dataHolder === undefined) {
        cache[filePath] = dataHolder = new DataHolder({
            // don't use immediate to avoid some long stack traces
            // (this will cause process.nextTick() to be used even if the data holder is settled when callback added)
            immediate: false
        });
        fs.stat(filePath, function(err, stat) {
            dataHolder.resolve(stat && stat.mtime ? stat.mtime.getTime() : -1);
        });
    }
    
    dataHolder.done(callback);
};
