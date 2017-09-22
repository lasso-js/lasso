'use strict';

var getLassoRenderContext = require('./getLassoRenderContext');
var lassoPageTag = require('./page-tag');
var extend = require('raptor-util/extend');
var path = require('path');

function isAttributePresent(attrs) {
    return !!(attrs.inlineStyleAttrs ||
            attrs.inlineScriptAttrs ||
            attrs.externalStyleAttrs ||
            attrs.externalScriptAttrs);
}

function renderSlot(attrs, lassoPageResult, out, lassoRenderContext) {
    var lassoConfig = lassoRenderContext.getLassoConfig();

    var cspNonceProvider = lassoConfig.cspNonceProvider;
    var slotName = attrs.name;
    var cspAttrs = null;
    var slotData = null;

    if (cspNonceProvider) {
        cspAttrs = {
            nonce: cspNonceProvider(out)
        };
    }
    if (isAttributePresent(attrs) || cspAttrs) {
        slotData = {
            inlineScriptAttrs: extend(extend({}, attrs.inlineScriptAttrs), cspAttrs),
            inlineStyleAttrs: extend(extend({}, attrs.inlineStyleAttrs), cspAttrs),
            externalScriptAttrs: extend({}, attrs.externalScriptAttrs),
            externalStyleAttrs: extend({}, attrs.externalStyleAttrs)
        };
    }

    var slotHtml = lassoPageResult.getSlotHtml(slotName, slotData);

    if (slotHtml) {
        out.write(slotHtml);
    }

    lassoRenderContext.emitAfterSlot(slotName, out);
}

module.exports = function render(input, out) {
    var slotName = input.name;
    var lassoRenderContext = getLassoRenderContext(out);
    var lassoPageResultAsyncValue = lassoRenderContext.data.lassoPageResult;
    var timeout = lassoRenderContext.data.timeout;
    var template = out.global.template;
    var templateHasMetaDeps = template && template.getDependencies;

    if (!lassoPageResultAsyncValue) {
        var pageConfig = lassoRenderContext.data.config || {};

        if (!templateHasMetaDeps && !pageConfig.dependencies && !pageConfig.packagePaths) {
            throw new Error('Lasso page result not found for slot "' + slotName + '". The <lasso-page> tag should be used to lasso the page.');
        }

        var dependencies = templateHasMetaDeps ? template.getDependencies() : [];

        if (pageConfig.packagePaths) {
            dependencies = pageConfig.packagePaths.concat(dependencies);
        }

        if (pageConfig.dependencies) {
            dependencies = dependencies.concat(pageConfig.dependencies);
        }

        pageConfig.dependencies = dependencies;
        pageConfig.cacheKey = (pageConfig.cacheKey || template) && template.path;
        pageConfig.dirname = (pageConfig.dirname || template) && path.dirname(template.path);
        pageConfig.filename = (pageConfig.filename || template) && template.path;
        pageConfig.flags = pageConfig.flags || out.global.flags || [];

        lassoPageTag(pageConfig, out);

        lassoRenderContext = getLassoRenderContext(out);
        lassoPageResultAsyncValue = lassoRenderContext.data.lassoPageResult;
    }

    lassoRenderContext.emitBeforeSlot(slotName, out);

    if (lassoPageResultAsyncValue.isResolved()) {
        renderSlot(input, lassoPageResultAsyncValue.data, out, lassoRenderContext);
    } else {
        var asyncOut = out.beginAsync({
            name: 'lasso-slot:' + slotName,
            timeout: timeout
        });

        lassoPageResultAsyncValue.done(function(err, lassoPageResult) {
            if (err) {
                // Trigger the error next tick so that it doesn't prevent
                // other listeners from being invoked in calling asyncOut.error()
                // triggers another error
                process.nextTick(() => {
                    asyncOut.error(err);
                });

                return;
            }

            renderSlot(input, lassoPageResult, asyncOut, lassoRenderContext);
            asyncOut.end();
        });
    }
};
