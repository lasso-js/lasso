module.exports = {
    getDir: function() {
        return null;
    },
    
    read: function(context) {
        if (!context) {
            throw new Error('context argument is required');
        }

        var loaderMetadata = context && context.loaderMetadata;
        // console.error('loaderMetadata: ', loaderMetadata);
        if (loaderMetadata) {
            return loaderMetadata.getCode(context);
        } else {

            return null;
        }
    },

    doCalculateKey: function() {
        return this.calculateKeyFromProps();
    }
};