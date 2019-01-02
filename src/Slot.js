var ok = require('assert').ok;

function Slot(contentType) {
    ok(contentType, 'contentType is required');
    this.contentType = contentType;
    this.content = [];
}

Slot.prototype = {
    addInlineCode: function(code, merge) {
        if (merge) {
            var prev = this.content.length ? this.content[this.content.length - 1] : null;
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

    wrapInDocumentLoaded: function(code, isAsync) {
        return '(function() { var run = function() { ' + code + ' }; if (document.readyState ' + (isAsync ? '!== "complete"' : '=== "loading"') + ') { ' + (isAsync ? 'window.addEventListener("load"' : 'document.addEventListener("DOMContentLoaded"') + ', run); } else { run(); } })();';
    },

    buildHtml: function() {
        var output = [];
        for (var i = 0, len = this.content.length; i < len; i++) {
            var content = this.content[i];
            if (content.inline) {
                if (this.contentType === 'js') {
                    output.push('<if(data.externalScriptAttrs && data.externalScriptAttrs.async)><script ...data.inlineScriptAttrs marko-body="static-text">' + this.wrapInDocumentLoaded(content.code, true) + '</script></if><else-if(data.externalScriptAttrs && data.externalScriptAttrs.defer)><script ...data.inlineScriptAttrs marko-body="static-text">' + this.wrapInDocumentLoaded(content.code) + '</script></else-if><else><script ...data.inlineScriptAttrs marko-body="static-text">' + content.code + '</script></else>'); // eslint-disable-line no-template-curly-in-string
                } else if (this.contentType === 'css') {
                    output.push('<style ...data.inlineStyleAttrs marko-body="static-text">' + content.code + '</style>'); // eslint-disable-line no-template-curly-in-string
                }
            } else {
                output.push(content.code);
            }
        }

        return output.join('\n');
    }
};

module.exports = Slot;
