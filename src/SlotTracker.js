const Slot = require('./Slot');
const InlinePos = require('./InlinePos');

function SlotTracker() {
    this.slots = {};
    this.slotNames = new Set();
}

SlotTracker.prototype = {
    addInlineCode: function(slotName, contentType, code, inlinePos, mergeInline) {
        this.slotNames.add(slotName);

        let slotKey = contentType + ':' + slotName;
        if (inlinePos === InlinePos.BEGINNING) {
            slotKey += ':before';
        } else if (inlinePos === InlinePos.END) {
            slotKey += ':after';
        }

        const slot = this.slots[slotKey] || (this.slots[slotKey] = new Slot(contentType));
        slot.addInlineCode(code, mergeInline);
    },

    addContent: function(slotName, contentType, content) {
        this.slotNames.add(slotName);

        const slotKey = contentType + ':' + slotName;
        const slot = this.slots[slotKey] || (this.slots[slotKey] = new Slot(contentType));
        slot.addContent(content);
    },

    getSlotsByName: function() {
        const slotsByName = {};
        const slots = this.slots;

        function addCode(slotList, key) {
            const slot = slots[key];
            if (slot) slotList.push(slot);
        }

        for (const slotName of this.slotNames) {
            const slotList = slotsByName[slotName] = [];
            addCode(slotList, 'css:' + slotName + ':before');
            addCode(slotList, 'css:' + slotName);
            addCode(slotList, 'css:' + slotName + ':after');

            addCode(slotList, 'js:' + slotName + ':before');
            addCode(slotList, 'js:' + slotName);
            addCode(slotList, 'js:' + slotName + ':after');
        }

        return slotsByName;
    }
};

module.exports = SlotTracker;
