var Slot = require('./Slot');
var forEachEntry = require('raptor-util').forEachEntry;

function SlotTracker() {
    this.slots = {};
}

SlotTracker.prototype = {
    addContent: function(slotName, contentType, content, inline, mergeInline) {
        var slot = this.slots[slotName] || (this.slots[slotName] = new Slot());
        slot.addContent(contentType, content, inline, mergeInline);
    },

    addContentBlock: function(slotName, contentType, content) {
        var slot = this.slots[slotName] || (this.slots[slotName] = new Slot());
        slot.addContentBlock(contentType, content);
    },

    getHtmlBySlot: function() {
        var htmlBySlot = {};
        forEachEntry(this.slots, function(slotName, slot) {
            htmlBySlot[slotName] = slot.buildHtml();
        });
        
        return htmlBySlot;
    }
};

module.exports = SlotTracker;