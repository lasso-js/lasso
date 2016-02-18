var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'head'
};

module.exports = function render(input, out) {
    slotTag(slotTagInput, out);
};