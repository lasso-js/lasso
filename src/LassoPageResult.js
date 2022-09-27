var extend = require('raptor-util/extend');
var toString = require('./util/to-string');
const LassoPrebuild = require('./LassoPrebuild');
var EMPTY_OBJECT = {};

function LassoPageResult (options = {}) {
    const { htmlBySlot, resources } = options;

    this.urlsBySlot = {};
    this.urlsByContentType = {};
    this.files = [];
    this.infoByBundleName = {};
    this.infoByAsyncBundleName = {};
    this._htmlBySlot = htmlBySlot || {};
    this.resources = resources || [];

    /**
     * If Lasso is configured to fingerprint inline code for
     * the purpose of Content Security Policy then this property
     * will store the array of fingerprints.
     */
    this._inlineCodeFingerprints = undefined;
}

LassoPageResult.deserialize = function (reader) {
    var json = '';

    return new Promise((resolve, reject) => {
        reader()
            .on('data', function (data) {
                json += data;
            })
            .on('end', function () {
                var o = JSON.parse(json);
                var lassoPageResult = new LassoPageResult();
                extend(lassoPageResult, o);
                resolve(lassoPageResult);
            })
            .on('error', function (err) {
                reject(err);
            });
    });
};

LassoPageResult.serialize = function(lassoPageResult) {
    return JSON.stringify(lassoPageResult);
};

LassoPageResult.prototype = {
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
     *   'body': '<script src="/static/test-page-body-f01892af.js"></script>',
     *   'head': '<link rel="stylesheet" href="/static/test-page-head-bf4cf798.css">'
     * }
     * </js>
     *
     * @return {Object} An object with slot names as property names and slot HTML as property values.
     */
    get htmlBySlot() {
        var htmlBySlot = {};
        for (var slotName in this._htmlBySlot) {
            if (this._htmlBySlot.hasOwnProperty(slotName)) {
                var slotHtml = this.getHtmlForSlot(slotName);
                htmlBySlot[slotName] = slotHtml;
            }
        }

        return htmlBySlot;
    },

    getHtmlBySlot: function() {
        return this.htmlBySlot;
    },

    /**
     * Returns the HTML for a single slot.
     * <p>
     * Example out:
     * <js>
     * "<script src="/static/test-page-body-f01892af.js"></script>"
     * </js>
     *
     * @param  {String} slotName The name of the slot (e.g. "head" or "body")
     * @param  {Object} data Input data to the slot that is used to render the actual slot HTML
     * @return {String} The HTML for the slot or an empty string if there is no HTML defined for the slot.
     */
    getHtmlForSlot: function(slotName, data) {
        return toString(this._htmlBySlot[slotName], data || EMPTY_OBJECT);
    },

    getHeadHtml: function(data) {
        return this.getHtmlForSlot('head', data);
    },

    getBodyHtml: function(data) {
        return this.getHtmlForSlot('body', data);
    },

    /**
     * Synonym for {@Link raptor/lasso/LassoPageResult#getHtmlForSlot}
     */
    getSlotHtml: function(slotName, data) {
        return this.getHtmlForSlot(slotName, data);
    },

    /**
     * Returns the JSON representation of the return value of {@Link #getHtmlBySlot}
     * @return {String} The JSON output
     */
    htmlSlotsToJSON: function(indentation) {
        return JSON.stringify(this.htmlBySlot, null, indentation);
    },

    toJSON: function() {
        var clone = extend({}, this);
        // Don't include the loaded templates when generating a JSON string
        delete clone._htmlTemplatesBySlot;
        return clone;
    },

    setHtmlBySlot: function(htmlBySlot) {
        this._htmlBySlot = htmlBySlot;
    },

    registerBundle: function(bundle, async, lassoContext) {
        var bundleInfoMap = async
            ? this.infoByAsyncBundleName
            : this.infoByBundleName;

        var info = bundleInfoMap[bundle.name] || (bundleInfoMap[bundle.name] = {});
        var url = bundle.getUrl(lassoContext);
        var slot = async ? undefined : bundle.slot;

        if (url) {
            this.addUrl(url, bundle.getSlot(), bundle.getContentType(), async, slot);
            info.url = url;
        }

        if (!bundle.isExternalResource && bundle.outputFile) {
            this.addFile(bundle.outputFile, bundle.getContentType(), async, slot);
            info.file = bundle.outputFile;
        }
    },

    registerResource: function(resource) {
        this.resources.push(resource);
    },

    addUrl: function(url, slot, contentType, isAsync) {
        if (!isAsync) {
            var urlsForSlot = this.urlsBySlot[slot] || (this.urlsBySlot[slot] = []);
            urlsForSlot.push(url);
        }

        var urlsForContentType = this.urlsByContentType[contentType] || (this.urlsByContentType[contentType] = []);
        urlsForContentType.push(url);
    },

    getOutputFilesWithInfo() {
        return this.files;
    },

    addFile: function(filePath, contentType, isAsync, slot) {
        this.files.push({
            path: filePath,
            contentType: contentType,
            async: isAsync,
            slot: slot
        });
    },

    /**
     * Returns the URLs of all the JavaScript resources for the page
     * @return {Array<String>} An array of URLs
     */
    getJavaScriptUrls: function() {
        return this.urlsByContentType.js || [];
    },

    /**
     * Returns the URLs of all the CSS resources for the page
     * @return {Array<String>} An array of URLs
     */
    getCSSUrls: function() {
        return this.urlsByContentType.css || [];
    },

    /**
     * Returns the URLs of all the JavaScript resources for the page
     * @return {Array<String>} An array of URLs
     */
    getUrlsForSlot: function(slot) {
        return this.urlsBySlot[slot] || [];
    },

    /**
     * Returns the {@Link raptor/files/File} objects for all the JavaScript resources for the page
     * @return {Array<raptor/files/File>} An array of File objects
     */
    getJavaScriptFiles: function() {
        return this.getFilePathsByContentType('js');
    },

    getFilePathsByContentType(contentType) {
        var paths = [];
        this.files.forEach((file) => {
            if (file.contentType === contentType) {
                paths.push(file.path);
            }
        });
        return paths;
    },

    /**
     * Returns the {@Link raptor/files/File} objects for all the CSS resources for the page
     * @return {Array<raptor/files/File>} An array of File objects
     */
    getCSSFiles: function() {
        return this.getFilePathsByContentType('css');
    },

    getOutputFiles: function() {
        return this.getJavaScriptFiles().concat(this.getCSSFiles());
    },

    getFileByBundleName: function(bundleName) {
        var info = this.infoByBundleName[bundleName];
        return info && info.file;
    },

    getFileByAsyncBundleName: function(bundleName) {
        var info = this.infoByAsyncBundleName[bundleName];
        return info && info.file;
    },

    getUrlByBundleName: function(bundleName) {
        var info = this.infoByBundleName[bundleName];
        return info && info.url;
    },

    getUrlByAsyncBundleName: function(bundleName) {
        var info = this.infoByAsyncBundleName[bundleName];
        return info && info.url;
    },

    getInlineCodeFingerprints: function() {
        return this._inlineCodeFingerprints;
    },

    setInlineCodeFingerprints: function(inlineCodeFingerprints) {
        this._inlineCodeFingerprints = inlineCodeFingerprints;
    },

    toLassoPrebuild (name, flags) {
        return new LassoPrebuild({
            slots: this.htmlBySlot,
            assets: this.resources,
            name,
            flags
        });
    }
};

module.exports = LassoPageResult;
