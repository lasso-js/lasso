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
                    output.push('<script%LASSO_ATTRS inlineScriptAttrs%>%LASSO_CONDITION isAsync%' + this.wrapInDocumentLoaded(content.code, true) + '%LASSO_CONDITION_END%%LASSO_CONDITION isDeferred%' + this.wrapInDocumentLoaded(content.code) + '%LASSO_CONDITION_END%%LASSO_CONDITION isSync%' + content.code + '%LASSO_CONDITION_END%</script>'); // eslint-disable-line no-template-curly-in-string
                } else if (this.contentType === 'css') {
                    output.push('<style%LASSO_ATTRS inlineStyleAttrs%>' + content.code + '</style>'); // eslint-disable-line no-template-curly-in-string
                }
            } else {
                output.push(content.code);
            }
        }

        return output.join('\n');
    }
};

module.exports = Slot;
