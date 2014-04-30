var raptorDust = require('raptor-dust');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'optimizer-page': require('../taglib/page-tag'),
        'optimizer-slot': require('../taglib/slot-tag'),
        'optimizer-head': require('../taglib/head-tag'),
        'optimizer-body': require('../taglib/body-tag'),
        'optimizer-img': require('../taglib/img-tag')
    }, dust);
};