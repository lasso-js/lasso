var cssParser = require('raptor-css-parser');
var extend = require('raptor-util').extend;

function buildContext(context) {
    context = context ? extend({}, context) : {};
    var dependency = context.dependency;
    var bundle = context.bundle;

    var writer = context.writer;

    context.cssDependency = dependency;
    context.cssBundle = bundle;
    context.relativeFromDir = writer.outputDir;

    if (bundle) {
        context.inPlaceFromDir = writer.outputDir;
    }

    return context;
}

module.exports = {
    contentType: 'text/css',
    
    name: module.id,

    filter: function(code, contentType, context) {
        var resolveResourceUrlContext;

        var fromDir = context.dependency.getManifestDir();

        if (contentType === 'text/css') {
            var optimizer = context.optimizer;

            var output = cssParser.replaceUrls(code, function(url) {
                if (!resolveResourceUrlContext) {
                    // Lazily build the new context if we find a URL in the CSS code
                    resolveResourceUrlContext = buildContext(context);
                }

                return optimizer.resolveResourceUrl(url, fromDir, resolveResourceUrlContext);
            }, this);

            // NOTE: output could be either the filter code or a promise, but we don't care
            return output;
        }
        else {
            return code;
        }
    }
};