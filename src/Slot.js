const ok = require('assert').ok;
const stringifyAttrs = require('./util/stringify-attrs');

function Slot(contentType) {
    ok(contentType, 'contentType is required');
    this.contentType = contentType;
    this.content = [];
}

Slot.prototype = {
    addInlineCode: function(code, merge) {
        if (merge) {
            const prev = this.content.length ? this.content[this.content.length - 1] : null;
            if (prev && prev.inline && prev.merge && typeof prev.code === 'string') {
                prev.code += '\n' + code;
                return;
            }
        }

        this.content.push({
            inline: true,
            code,
            merge: merge !== false
        });
    },

    addContent: function(content) {
        this.content.push({
            inline: false,
            code: content
        });
    }
};

Slot.render = function(slot, data) {
    let html = '';
    let sep = '';

    for (const content of slot.content) {
        html += sep;
        sep = '\n';

        switch (slot.contentType) {
        case 'js':
            html += (content.inline ? inlineScript : externalScript)(content.code, data);
            break;
        case 'css':
            html += (content.inline ? inlineStyle : externalStyle)(content.code, data);
            break;
        default:
            throw new Error('Invalid content type: ' + slot.contentType);
        }
    }

    return html;
};

function inlineScript(content, data) {
    const scriptAttrs = data.externalScriptAttrs;
    let result = `<script${stringifyAttrs(data.inlineScriptAttrs)}>`;

    if (scriptAttrs) {
        if (scriptAttrs.async) {
            result += wrapInDocumentLoaded(content, true);
        } else if (scriptAttrs.defer) {
            result += wrapInDocumentLoaded(content);
        } else {
            result += content;
        }
    } else {
        result += content;
    }

    return `${result}</script>`;
}

function inlineStyle(content, data) {
    return `<style${stringifyAttrs(data.inlineStyleAttrs)}>${content}</style>`;
}

function externalScript(attrs, data) {
    return `<script${stringifyAttrs(Object.assign({}, attrs, data.externalScriptAttrs))}></script>`;
}

function externalStyle(attrs, data) {
    return `<link${stringifyAttrs(Object.assign({ rel: 'stylesheet' }, attrs, data.externalStyleAttrs))}>`;
}

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
