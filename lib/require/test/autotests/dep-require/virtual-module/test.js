exports.createDependency = function(dirname) {
    return {
        virtualModule: {
            path: __dirname + '/something.foo',
            clientPath: '/virtual-module/something.foo',
            read(lassoContext, callback) {
                setTimeout(function() {
                    callback(null, 'exports.hello = "world"; exports.filename = __filename;');
                }, 10);
            }
        }
    };
};