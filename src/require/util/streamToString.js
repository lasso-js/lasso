module.exports = function(stream) {
    return new Promise((resolve, reject) => {
        let str = '';
        stream
            .on('data', function(data) {
                str += data;
            })
            .on('error', function(err) {
                reject(err);
            })
            .on('end', function() {
                resolve(str);
            });
    });
};
