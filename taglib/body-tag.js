var slotTag = require('./slot-tag');

var slotTagInput = {
    name: 'body'
};

module.exports = {
    process: function(input, context) {
        slotTag.process(slotTagInput, context);
    }
};