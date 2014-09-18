module.exports = {
    getDir: function() {
        return null;
    },

    read: function(optimizerContext) {
        if (!optimizerContext) {
            throw new Error('optimizerContext argument is required');
        }

        var loaderMetadata = optimizerContext && optimizerContext.loaderMetadata;
        // console.error('loaderMetadata: ', loaderMetadata);
        if (loaderMetadata) {
            return loaderMetadata.getCode(optimizerContext);
        } else {

            return null;
        }
    },

     calculateKey: function() {
        return this.calculateKeyFromProps();
    }
};
