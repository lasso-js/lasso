var nodePath = require('path');
var mime = require('mime');

var FileUrlBuilder = function(config) {
    if (!config) {
        throw new Error("config is required");
    }
    
    this.config = config;
    this.urlPrefix = config.getUrlPrefix();
    this.outputDir = config.getOutputDir();
    this.includeSlotName = config.includeBundleSlotNames === true;
};

FileUrlBuilder.prototype = {
    /**
     * Builds a URL that points to a bundle 
     * 
     * @param bundle {optimizer.Bundle} The output bundle to generate a URL to
     * @param basePath The base path is only if using relative paths. The base path will vary by output page
     * 
     * @returns {String} The generated URL
     */
    buildBundleUrl: function(bundle, context) {
        if (!context) {
            throw new Error("context is required");
        }
        
        var basePath = context.basePath;

        if (bundle.url) {
            return bundle.url;
        }
        else if (bundle.inPlaceDeployment === true && bundle.sourceResource) {

            var url = this.config.getUrlForSourceFile(bundle.sourceResource.getAbsolutePath());
            if (url == null) {
                if (basePath) {
                    return nodePath.relative(basePath, bundle.sourceResource.getAbsolutePath());    
                }
                else {
                    return bundle.sourceResource.getURL();
                }
                
            }
            return url;
        }

        var prefix = this.getPrefix(basePath),
            bundleFilename = this.getBundleFilename(bundle, context);

        if (!prefix.endsWith('/') && !bundleFilename.startsWith('/')) {
            prefix += '/';
        }

        return prefix + bundleFilename;
    },

    getInPlaceResourceUrl: function(filePath, basePath) {
        var config = this.config;
        if (config.hasServerSourceMappings()) {
            return config.getUrlForSourceFile(filePath);
        }
        else if (basePath) {
            return nodePath.relative(basePath, filePath);
        }
        else {
            return null;
        }
    },
    
    buildResourceUrl: function(filename, context) {

        var basePath = context.basePath || this.config.getBasePath();
        var prefix = this.getPrefix(basePath);

        if (!prefix.endsWith('/') && !filename.startsWith('/')) {
            prefix += '/';
        }

        return prefix + filename;
    },

    /**
     * Generates the output filename for a bundle.
     * 
     * This method handles adding a checksum (if that option is enabled)
     * 
     * @param bundle {optimizer.Bundle} The output bundle
     * 
     * @returns {String} The generated filename
     */
    getBundleFilename: function(bundle, context) {
        
        var filename = bundle.getName();
        var ext = "." + this.getFileExtension(bundle);

        if (filename.endsWith(ext)) {
            filename = filename.slice(0, 0-ext.length);
        }

        var checksum;

        if (bundle.sourceDependency && bundle.sourceDependency.hasModifiedChecksum()) {
            var lastSlash = filename.lastIndexOf('/');
            if (lastSlash != -1) {
                filename = filename.substring(lastSlash+1);
            }
            checksum = bundle.sourceDependency.getModifiedChecksum(context);
        }
        else {
            checksum = bundle.getChecksum();
        }
        
        filename = filename.replace(/^\//, '').replace(/[^A-Za-z0-9_\-\.]/g, '-') + (this.includeSlotName ? '-' + bundle.getSlot() : '') + (checksum ? "-" + checksum : "") + ext;
        return filename;
    },
    
    /**
     * Returns the file extension to use for a bundle.
     * 
     * Internally this method uses a mime lookup module and uses the content type of the bundle to lookup the extension
     * 
     * @param bundle {optimizer.Bundle}
     * @returns {String} The file extension to use.
     */
    getFileExtension: function(bundle) {
        return mime.extension(bundle.getContentType());
    },
    
    /**
     * Returns the prefix that should be added to the bundle name.
     * 
     * If a URL prefix is not configured then a relative path will be
     * generated based on the output directory of the bundle
     * and the provided base path
     * 
     * @param basePath {String} The base path to use for generating a relative path to the output directory of the bundle. This argument is only required if a URL prefix is not configured.
     * @returns
     */
    getPrefix: function(basePath) {
        var prefix = this.urlPrefix;

        if (!prefix) {
            if (basePath) {
                
                var toPath = this.outputDir.toString();

                var fromPath = basePath.toString();

                prefix = nodePath.relative(fromPath, toPath) + '/';

                if (prefix === '/') {
                    prefix = './';
                }
            }
            else {
                prefix = "/static/";
            }
        }
        
        return prefix;
    }
};


module.exports = FileUrlBuilder;