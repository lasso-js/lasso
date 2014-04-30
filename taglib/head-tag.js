var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'head'
};

module.exports = function render(input, context) {
    slotTag(slotTagInput, context);
};