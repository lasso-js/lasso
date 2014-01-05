var startRegExp = /<!--\s*\[\s*raptor-dependency\:?\s+(\w+)\s*\]\s*-->/g;
var endRegExp = /<!--\s*\[\/\s*raptor-dependency\s*\]\s*-->/g;

function HtmlInjector(pageHtml, keepMarkers) {
    this.keepMarkers = keepMarkers === true;
    this.parts = [];
    this.injectIndexes = {};
    this.findSlots(pageHtml);
}

HtmlInjector.prototype = {
    findSlots: function(pageHtml) {
        var injectIndexes = this.injectIndexes,
            parts = this.parts,
            startMatches, 
            endMatch,
            begin = 0;
            
            
        startRegExp.lastIndex = 0;
        
        
        while ((startMatches = startRegExp.exec(pageHtml))) {
            var slotName = startMatches[1];
            
            parts.push(pageHtml.substring(begin, startMatches.index));
            
            injectIndexes[slotName] = parts.length;
            parts.push('');
            
            endRegExp.lastIndex = startRegExp.lastIndex;
            
            endMatch = endRegExp.exec(pageHtml);
            if (endMatch) {
                if (this.keepMarkers) {
                    begin = endMatch.index;
                }
                else {
                    begin = endRegExp.lastIndex;
                }
                
                startRegExp.lastIndex = endRegExp.lastIndex;
            }
            else {
                begin = startRegExp.lastIndex;
            }
            
        }
        
        if (begin < pageHtml.length) {
            parts.push(pageHtml.substring(begin));
        }
    },
    
    inject: function(slot, injectHtml) {
        var injectIndex = this.injectIndexes[slot];
        if (injectIndex === undefined) {
            throw new Error('Starting marker not found for slot "' + slot + '"');
        }
        this.parts[injectIndex] = this.keepMarkers ? ('<!-- [raptor-dependency: ' + slot + '] -->' + injectHtml + '<!-- [/raptor-dependency] -->') : injectHtml;
    },
    
    getHtml: function() {
        return this.parts.join('');
    }
};

module.exports = HtmlInjector;