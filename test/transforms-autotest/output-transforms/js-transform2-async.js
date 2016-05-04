'use strict';

var ok = require('assert').ok;

exports.stream = false;

exports.contentType = 'js';

exports.transform = function(code, context) {
    var contentType = context.contentType;
    ok(contentType === 'js', '"js" content type expected');

    return new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve(code + '-JavaScriptTransform2Async');
        }, 100);
    });
};

exports.name = module.id;