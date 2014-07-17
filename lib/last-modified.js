var fs = require('fs');
var DataHolder = require('raptor-async/DataHolder');

var cache = {};

exports.forFile = function(filePath, callback) {
    
    var dataHolder = cache[filePath];
    if (dataHolder === undefined) {
        cache[filePath] = dataHolder = new DataHolder();
        fs.stat(filePath, function(err, stat) {
            dataHolder.resolve(stat && stat.mtime ? stat.mtime.getTime() : -1);
        });
    }
    
    dataHolder.done(callback);
};
