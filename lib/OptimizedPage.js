function OptimizedPage() {
    this.htmlBySlot = {};
    this.loaderMetadata = null;
    this.urlsBySlot = {};
    this.urlsByContentType = {};
    this.filesByContentType = {};
}

OptimizedPage.prototype = {
    /**
     * Returns the HTML for all slots on the page.
     *
     * An object is returned in which property name
     * is the name of the slot and the value is the corresponding
     * HTML for the slot.
     *
     * <p>
     * Example output:
     * <js>
     * {
     *   'body': '<script type="text/javascript" src="/static/test-page-body-f01892af.js"></script>',
     *   'head': '<link rel="stylesheet" type="text/css" href="/static/test-page-head-bf4cf798.css">'
     * }
     * </js>
     * 
     * @return {Object} An object with slot names as property names and slot HTML as property values.
     */
    getHtmlBySlot: function() {
        return this.htmlBySlot;
    },
    
    /**
     * Returns the HTML for a single slot.
     * <p>
     * Example out:
     * <js>
     * "<script type="text/javascript" src="/static/test-page-body-f01892af.js"></script>"
     * </js>
     * 
     * @param  {String} slotName The name of the slot (e.g. "head" or "body")
     * @return {String} The HTML for the slot or an empty string if there is no HTML defined for the slot.
     */
    getHtmlForSlot: function(slotName) {
        return this.htmlBySlot[slotName] || '';
    },
    
    getLoaderMetadata: function() {
        return this.loaderMetadata;
    },
    
    /**
     * Synonym for {@Link raptor/optimizer/OptimizedPage#getHtmlForSlot}
     */
    getSlotHtml: function(slot) {
        return this.htmlBySlot[slot];
    },
    
    /**
     * Returns the JSON representation of the return value of {@Link #getHtmlBySlot}
     * @return {String} The JSON output
     */
    toJSON: function() {
        return JSON.stringify(this.htmlBySlot);
    },

    setHtmlBySlot: function(htmlBySlot) {
        this.htmlBySlot = htmlBySlot;
    },
    
    setLoaderMetadata: function(loaderMetadata) {
        this.loaderMetadata = loaderMetadata;
    },

    addUrl: function(url, slot, contentType) {
        var urlsForSlot = this.urlsBySlot[slot] || (this.urlsBySlot[slot] = []);
        urlsForSlot.push(url);

        var urlsForContentType = this.urlsByContentType[contentType] || (this.urlsByContentType[contentType] = []);
        urlsForContentType.push(url);
    },

    addFile: function(filePath, contentType) {
        var filesForContentType = this.filesByContentType[contentType] || (this.filesByContentType[contentType] = []);
        filesForContentType.push(filePath);
    },

    /**
     * Returns the URLs of all the optimized JavaScript resources for the page
     * @return {Array<String>} An array of URLs
     */
    getJavaScriptUrls: function() {
        return this.urlsByContentType["js"] || [];
    },

    /**
     * Returns the URLs of all the optimized CSS resources for the page
     * @return {Array<String>} An array of URLs
     */
    getCSSUrls: function() {
        return this.urlsByContentType["css"] || [];
    },

    /**
     * Returns the URLs of all the optimized JavaScript resources for the page
     * @return {Array<String>} An array of URLs
     */
    getUrlsForSlot: function(slot) {
        return this.urlsBySlot[slot] || [];
    },

    /**
     * Returns the {@Link raptor/files/File} objects for all the optimized JavaScript resources for the page
     * @return {Array<raptor/files/File>} An array of File objects
     */
    getJavaScriptFiles: function() {
        return this.filesByContentType["js"] || [];
    },

    /**
     * Returns the {@Link raptor/files/File} objects for all the optimized CSS resources for the page
     * @return {Array<raptor/files/File>} An array of File objects
     */
    getCSSFiles: function() {
        return this.filesByContentType["css"] || [];
    }
};

module.exports = OptimizedPage;