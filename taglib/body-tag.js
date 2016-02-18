var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'body'
};

module.exports = function render(input, out) {
    slotTag(slotTagInput, out);
};