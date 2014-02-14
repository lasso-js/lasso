var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'head'
};

module.exports = {
    process: function(input, context) {
        slotTag.process(slotTagInput, context);
    }
};