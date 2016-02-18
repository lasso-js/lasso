var slotTag = require('./slot-tag');
var extend = require('raptor-util').extend;

var slotTagInput = {
    name: 'body'
};

module.exports = function render(input, out) {
    slotTag(extend(slotTagInput, input), out);
};
