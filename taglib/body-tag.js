var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'body'
};

module.exports = function render(input, context) {
    slotTag(slotTagInput, context);
};