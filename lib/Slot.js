var ok = require('assert').ok;

function Slot(contentType) {
    ok(contentType, 'contentType is required');
    this.contentType = contentType;
    this.content = [];
    
}

Slot.prototype = {
    addInlineCode: function(code, merge) {
        if (merge) {
            var prev = this.content.length ? this.content[this.content.length-1] : null;
            if (prev && prev.inline && prev.merge) {
                prev.code += '\n' + code;
                return;
            }
        }

        this.content.push({
            inline: true,
            code: code,
            merge: merge !== false
        });
    },

    addContent: function(content) {
        this.content.push({
            inline: false,
            code: content
        });
    },
    
    buildHtml: function() {
        var output = [];
        for (var i=0, len=this.content.length; i<len; i++) {
            var content = this.content[i];
            if (content.inline) {
                if (this.contentType === 'js') {
                    output.push('<script type="text/javascript">' + content.code + '</script>');
                } else if (this.contentType === 'css') {
                    output.push('<style type="text/css">' + content.code + '</style>');
                }
            } else {
                output.push(content.code);
            }
        }

        return output.join('\n');
    }
};

module.exports = Slot;