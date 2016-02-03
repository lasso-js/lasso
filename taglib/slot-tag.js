var util = require('./util');


function renderSlot(slotName, lassoPageResult, out, lassoRenderContext) {

    var lassoConfig = lassoRenderContext.getLassoConfig();

    var cspNonceProvider = lassoConfig.cspNonceProvider;
    var slotData = null;

    if (cspNonceProvider) {
        var cspAttrs = {
            nonce: cspNonceProvider(out)
        };

        slotData = {
            inlineScriptAttrs: cspAttrs,
            inlineStyleAttrs: cspAttrs
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
        renderSlot(slotName, lassoPageResultAsyncValue.data, out, lassoRenderContext);
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

            renderSlot(slotName, lassoPageResult, asyncContext, lassoRenderContext);
            asyncContext.end();
        });
    }
};