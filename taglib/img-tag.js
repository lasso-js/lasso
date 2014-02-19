require('raptor-detect/runtime').detect({
    'server': function() {
        require('./img-tag_server');
    }
});