module.exports = {
    getCode: function(context) {
        if (!context) {
            throw new Error('context argument is required');
        }

        var loaderMetadata = context && context.loaderMetadata;
        // console.error('loaderMetadata: ', loaderMetadata);
        if (loaderMetadata) {
            return '$rloaderMeta=' + loaderMetadata.toJSON() + ';';
        }
    }
};