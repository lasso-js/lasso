var EMPTY_OBJECT = {};
module.exports = function toString(val, data) {
    if (typeof val === 'function') {
        val = val(data || EMPTY_OBJECT);
    }

    return '' + (val || '');
};
