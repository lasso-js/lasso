module.exports = {
    read: function(context) {
        if (!context) {
            throw new Error('context argument is required');
        }

        var loaderMetadata = context && context.loaderMetadata;
        // console.error('loaderMetadata: ', loaderMetadata);
        if (loaderMetadata) {
            return loaderMetadata.readCode(context);
        }
        else {

            return null;
        }
    }
};