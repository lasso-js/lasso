var ok = require('assert').ok;
var stringifyAttrs = require('./util/stringify-attrs');

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
        const output = [];
        let isTemplate = false;
        for (let i = 0, len = this.content.length; i < len; i++) {
            const content = this.content[i];
            if (content.inline) {
                if (this.contentType === 'js') {
                    isTemplate = true;
                    output.push(input => {
                        const scriptAttrs = input.externalScriptAttrs;
                        const code = typeof content.code === 'function' ? content.code(input) : content.code;
                        let result = `<script${stringifyAttrs(input.inlineScriptAttrs)}>`;

                        if (scriptAttrs) {
                            if (scriptAttrs.async) {
                                result += this.wrapInDocumentLoaded(code, true);
                            } else if (scriptAttrs.defer) {
                                result += this.wrapInDocumentLoaded(code);
                            } else {
                                result += code;
                            }
                        } else {
                            result += code;
                        }

                        return `${result}</script>`;
                    });
                } else if (this.contentType === 'css') {
                    isTemplate = true;
                    output.push(input => {
                        const code = typeof content.code === 'function'
                            ? content.code(input)
                            : content.code;
                        return `<style${stringifyAttrs(input.inlineScriptAttrs)}>${code}</style>`;
                    });
                }
            } else {
                isTemplate = isTemplate || typeof content.code === 'function';
                output.push(content.code);
            }
        }

        if (isTemplate) {
            return input => {
                let result = '';
                for (let i = 0; i < output.length; i++) {
                    if (i !== 0) {
                        result += '\n';
                    }

                    const part = output[i];
                    result += typeof part === 'function' ? part(input) : part;
                }

                return result;
            };
        }

        return output.join('\n');
    }
};

module.exports = Slot;
