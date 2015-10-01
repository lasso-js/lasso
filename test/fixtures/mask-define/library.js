(function () {
    'use strict';

    function Library() {}

    if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
        define(function() {
            return Library;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports.Library = Library;
    } else {
        window.Library = Library;
    }
}());
