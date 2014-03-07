var Slot = require('./Slot');
var InlinePos = require('./InlinePos');

function SlotTracker() {
    this.slots = {};
    this.slotNames = {};
}

SlotTracker.prototype = {
    addInlineCode: function(slotName, contentType, code, inlinePos, mergeInline) {
        this.slotNames[slotName] = true;

        var slotKey = contentType + ':' + slotName;
        if (inlinePos === InlinePos.BEGINNING) {
            slotKey += ':before';
        } else if (inlinePos === InlinePos.END) {
            slotKey += ':after';
        }

        var slot = this.slots[slotKey] || (this.slots[slotKey] = new Slot(contentType));
        slot.addInlineCode(code, mergeInline);
    },

    addContent: function(slotName, contentType, content) {
        this.slotNames[slotName] = true;
        var slotKey = contentType + ':' + slotName;
        var slot = this.slots[slotKey] || (this.slots[slotKey] = new Slot(contentType));
        slot.addContent(content);
    },


    getHtmlBySlot: function() {
        var htmlBySlot = {};
        var slots = this.slots;

        function addCode(slotName, lookup) {
            var slot = slots[lookup];

            if (!slot) {
                return;
            }

            var html = htmlBySlot[slotName];
            if (html == null) {
                htmlBySlot[slotName] = slot.buildHtml();
            } else {
                htmlBySlot[slotName] = html + '\n' + slot.buildHtml();
            }
        }

        var slotNames = Object.keys(this.slotNames);
        for (var i=0, len=slotNames.length; i<len; i++) {
            var slotName = slotNames[i];

            addCode(slotName, 'css:' + slotName + ':before');
            addCode(slotName, 'css:' + slotName);
            addCode(slotName, 'css:' + slotName + ':after');

            addCode(slotName, 'js:'  + slotName + ':before');
            addCode(slotName, 'js:'  + slotName);
            addCode(slotName, 'js:'  + slotName + ':after');
        }

        return htmlBySlot;
    }
};

module.exports = SlotTracker;