const Slot = require('./Slot');
const InlinePos = require('./InlinePos');
const toString = require('./util/to-string');

function SlotTracker() {
    this.slots = {};
    this.slotNames = {};
}

SlotTracker.prototype = {
    addInlineCode: function(slotName, contentType, code, inlinePos, mergeInline) {
        this.slotNames[slotName] = true;

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
        this.slotNames[slotName] = true;
        const slotKey = contentType + ':' + slotName;
        const slot = this.slots[slotKey] || (this.slots[slotKey] = new Slot(contentType));
        slot.addContent(content);
    },

    getHtmlBySlot: function() {
        const htmlBySlot = {};
        const slots = this.slots;

        function addCode(slotName, lookup) {
            const slot = slots[lookup];

            if (!slot) {
                return;
            }

            const html = htmlBySlot[slotName];
            const newHtml = slot.buildHtml();
            htmlBySlot[slotName] =
                html == null
                    ? newHtml
                    : (data) =>
                        `${toString(html, data)}\n${toString(newHtml, data)}`;
        }

        const slotNames = Object.keys(this.slotNames);
        for (let i = 0, len = slotNames.length; i < len; i++) {
            const slotName = slotNames[i];

            addCode(slotName, 'css:' + slotName + ':before');
            addCode(slotName, 'css:' + slotName);
            addCode(slotName, 'css:' + slotName + ':after');

            addCode(slotName, 'js:' + slotName + ':before');
            addCode(slotName, 'js:' + slotName);
            addCode(slotName, 'js:' + slotName + ':after');
        }

        return htmlBySlot;
    }
};

module.exports = SlotTracker;
