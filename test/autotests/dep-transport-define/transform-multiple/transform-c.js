module.exports = {
    id: __filename,
    stream: false,
    createTransform(transformConfig) {
        return function myTransform(code, lassoContext) {
            return code.replace(/foo/g, transformConfig.replacement);
        };
    }
};