module.exports = {
    id: __filename,
    stream: false,
    createTransform(transformConfig) {
        return function myTransform(code, lassoContext) {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    resolve(code.replace(/hello/g, 'HELLO'));
                }, 10);
            });

        };
    }
};