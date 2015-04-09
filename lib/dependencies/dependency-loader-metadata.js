module.exports = {
    getDir: function() {
        return null;
    },

    read: function(lassoContext) {
        if (!lassoContext) {
            throw new Error('lassoContext argument is required');
        }

        var loaderMetadata = lassoContext && lassoContext.loaderMetadata;
        // console.error('loaderMetadata: ', loaderMetadata);
        if (loaderMetadata) {
            return loaderMetadata.getCode(lassoContext);
        } else {

            return null;
        }
    },

     calculateKey: function() {
        return this.calculateKeyFromProps();
    }
};
