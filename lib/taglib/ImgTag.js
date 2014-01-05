require('raptor-detect/runtime').detect({
    'server': function() {
        require('./ImgTag_server');
    }
});