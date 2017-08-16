module.exports = {

    properties: {
        'path': 'string'
    },

    // we don't actually produce JavaScript or CSS
    contentType: 'none',

    read: function(lassoContext) {
        return null;
    },

    async calculateKey () {
        return 'comment';
    }
};
