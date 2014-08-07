var extend = require('raptor-util/extend');
var rootDir = require('app-root-dir').get();
var nodePath = require('path');

function OptimizedPage() {
    this.htmlBySlot = {};
    this.urlsBySlot = {};
    this.urlsByContentType = {};
    this.filesByContentType = {};
}

OptimizedPage.deserialize = function(reader, callback) {
    var json = '';

    reader()
        .on('data', function(data) {
            json += data;
        })
        .on('end', function() {
            var o = JSON.parse(json);
            var optimizedPage = new OptimizedPage();
            extend(optimizedPage, o);
            callback(null, optimizedPage);
        })
        .on('error', function(err) {
            callback(err);
        });
};

OptimizedPage.serialize = function(optimizedPage) {
    var json = JSON.stringify(optimizedPage);
    return json;
};

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


    getHeadHtml: function() {
        return this.getHtmlForSlot('head');
    },

    getBodyHtml: function() {
        return this.getHtmlForSlot('body');
    },
    
    /**
     * Synonym for {@Link raptor/optimizer/OptimizedPage#getHtmlForSlot}
     */
    getSlotHtml: function(slot) {
        return this.getHtmlForSlot(slot);
    },
    
    /**
     * Returns the JSON representation of the return value of {@Link #getHtmlBySlot}
     * @return {String} The JSON output
     */
    htmlSlotsToJSON: function(indentation) {
        return JSON.stringify(this.htmlBySlot, null, indentation);
    },

    setHtmlBySlot: function(htmlBySlot) {
        this.htmlBySlot = htmlBySlot;
    },

    addUrl: function(url, slot, contentType) {
        var urlsForSlot = this.urlsBySlot[slot] || (this.urlsBySlot[slot] = []);
        urlsForSlot.push(url);

        var urlsForContentType = this.urlsByContentType[contentType] || (this.urlsByContentType[contentType] = []);
        urlsForContentType.push(url);
    },

    addFile: function(filePath, contentType) {

        filePath = nodePath.relative(rootDir, filePath);
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
    },

    getOutputFiles: function() {
        return this.getJavaScriptFiles().concat(this.getCSSFiles());
    }
};

module.exports = OptimizedPage;