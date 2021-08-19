var ok = require('assert').ok;
var toString = require('./util/to-string');
var stringifyAttrs = require('./util/stringify-attrs');
var inlineBuilders = {
    js: (source) => (data) => {
        const scriptAttrs = data.externalScriptAttrs;
        const code = toString(source, data);
        let result = `<script${stringifyAttrs(data.inlineScriptAttrs)}>`;

        if (scriptAttrs) {
            if (scriptAttrs.async) {
                result += wrapInDocumentLoaded(code, true);
            } else if (scriptAttrs.defer) {
                result += wrapInDocumentLoaded(code);
            } else {
                result += code;
            }
        } else {
            result += code;
        }

        return `${result}</script>`;
    },
    css: (source) => (data) => {
        return `<style${stringifyAttrs(data.inlineStyleAttrs)}>${toString(
            source,
            data
        )}</style>`;
    }
};

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

    buildHtml: function() {
        const output = [];
        let isTemplate = false;
        for (let i = 0, len = this.content.length; i < len; i++) {
            const content = this.content[i];
            if (content.inline) {
                const builder = inlineBuilders[this.contentType];

                if (builder) {
                    isTemplate = true;
                    output.push(builder(content.code));
                }
            } else {
                isTemplate = isTemplate || typeof content.code === 'function';
                output.push(content.code);
            }
        }

        if (isTemplate) {
            return data => {
                let result = '';
                for (let i = 0; i < output.length; i++) {
                    if (i !== 0) {
                        result += '\n';
                    }

                    result += toString(output[i], data);
                }

                return result;
            };
        }

        return output.join('\n');
    }
};

function wrapInDocumentLoaded(code, isAsync) {
    return (
        '(function() { var run = function() { ' +
        code +
        ' }; if (document.readyState ' +
        (isAsync ? '!== "complete"' : '=== "loading"') +
        ') { ' +
        (isAsync
            ? 'window.addEventListener("load"'
            : 'document.addEventListener("DOMContentLoaded"') +
        ', run); } else { run(); } })();'
    );
}

module.exports = Slot;
