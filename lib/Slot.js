function Slot() {
    this.htmlByContentType = {};
    this.inlineContentByContentType = {};
}

Slot.prototype = {
    addContent: function(contentType, content, inline) {
        var lookup = inline ? this.inlineContentByContentType : this.htmlByContentType;
        var contentArray = lookup[contentType] || (lookup[contentType] = []);
        contentArray.push(content);
    },

    addScriptBlock: function(code) {
        this.addContent('application/javascript', '<script type="text/javascript">' + code + '</script>', false);
    },

    addStyleSheetBlock: function(code) {
        this.addContent('text/css', '<style type="text/css">' + code + '</style>', false);
    },

    addContentBlock: function(contentType, code) {
        if (contentType === 'application/javascript') {
            this.addScriptBlock(code);
        }
        else {
            this.addStyleSheetBlock(code);
        }
    },
    
    buildHtml: function() {
        var js = this.htmlByContentType['application/javascript'];
        var css = this.htmlByContentType['text/css'];
        
        js = js ? js.join('\n') : '';
        css = css ? css.join('\n') : '';
        
        var inlineJs = this.inlineContentByContentType['application/javascript'];
        var inlineCss = this.inlineContentByContentType['text/css'];
        
        if (inlineJs) {
            js += '<script type="text/javascript">' + inlineJs.join('\n') + '</script>';
        }
        
        if (inlineCss) {
            css += '<style type="text/css">' + inlineCss.join('\n') + '</style>';
        }
        
        if (js && css) {
            return css + '\n' + js;
        }
        else if (js) {
            return js;
        }
        else if (css) {
            return css;
        }
        else {
            return '';
        }
    }
};

module.exports = Slot;