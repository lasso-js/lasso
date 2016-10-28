'use strict';

var util = require('./util');
var extend = require('raptor-util').extend;

function isAttributePresent(input) {
    return !!(input.inlineStyleAttrs ||
            input.inlineScriptAttrs ||
            input.externalStyleAttrs ||
            input.externalScriptAttrs);
}

function renderSlot(input, lassoPageResult, out, lassoRenderContext) {
    var lassoConfig = lassoRenderContext.getLassoConfig();

    var cspNonceProvider = lassoConfig.cspNonceProvider;
    var slotName = input.name;
    var cspAttrs = null;
    var slotData = null;

    if (cspNonceProvider) {
        cspAttrs = {
            nonce: cspNonceProvider(out)
        };
    }
    if (isAttributePresent(input) || cspAttrs) {
        slotData = {
            inlineScriptAttrs: extend(extend({}, input.inlineScriptAttrs), cspAttrs),
            inlineStyleAttrs: extend(extend({}, input.inlineStyleAttrs), cspAttrs),
            externalScriptAttrs: extend({}, input.externalScriptAttrs),
            externalStyleAttrs: extend({}, input.externalStyleAttrs)
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
    var lassoRenderContext = util.getLassoRenderContext(out);
    var lassoPageResultAsyncValue = lassoRenderContext.data.lassoPageResult;
    var timeout = lassoRenderContext.data.timeout;

    if (!lassoPageResultAsyncValue) {
        throw new Error('Lasso page result not found for slot "' + slotName + '". The <lasso-page> tag should be used to lasso the page.');
    }

    lassoRenderContext.emitBeforeSlot(slotName, out);

    if (lassoPageResultAsyncValue.isResolved()) {
        renderSlot(input, lassoPageResultAsyncValue.data, out, lassoRenderContext);
    } else {
        var asyncContext = out.beginAsync({
            name: 'lasso-slot:' + slotName,
            timeout: timeout
        });

        lassoPageResultAsyncValue.done(function(err, lassoPageResult) {
            if (err) {
                asyncContext.error(err);
                return;
            }

            renderSlot(input, lassoPageResult, asyncContext, lassoRenderContext);
            asyncContext.end();
        });
    }
};
