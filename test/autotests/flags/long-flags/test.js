var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        flags: [
            'a',
            'jldksjflksajdflsakjflskadfjkjdsafhksdjfhkfdgd',
            'dfsgsgsgsdfgdsgfdgssdfgadfjkjdsafhksdjfhkdjsf',
            'qwfddfdgsfdklkkfdgssdfgadfjkjdsafhkfdgdsgdsdd',
            'uytursgsgsgsdfgdsgfdiusaiuvuefvdsbgoinkdcnoia',
            'xnioenoiwihfuaevfsmoaeuavrhgbdjsnkmkmoieyabsb',
            'sopoiresjhvdgasmasofniewrubyadfknjankndsfkjnk',
            'hhabebherbsjbndkjserwoijwnbhewrfuwherfuewfknd'
        ],
        bundlingEnabled: false
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            './browser.json'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    // if we made it here, all is good.
};