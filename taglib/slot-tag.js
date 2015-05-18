var util = require('./util');

function renderSlot(slotName, lassoPageResult, context, lassoContext) {
    var slotHtml = lassoPageResult.getSlotHtml(slotName);

    if (slotHtml) {
        context.write(slotHtml);
    }

    lassoContext.emitAfterSlot(slotName, context);
}

module.exports = function render(input, context) {
    var slotName = input.name;
    var lassoRenderContext = util.getLassoRenderContext(context);
    var lassoPageResultAsyncValue = lassoRenderContext.data.lassoPageResult;
    var timeout = lassoRenderContext.data.timeout;

    if (!lassoPageResultAsyncValue) {
        throw new Error('Lasso page result not found for slot "' + slotName + '". The <lasso-page> tag should be used to lasso the page.');
    }

    lassoRenderContext.emitBeforeSlot(slotName, context);

    if (lassoPageResultAsyncValue.isResolved()) {
        renderSlot(slotName, lassoPageResultAsyncValue.data, context, lassoRenderContext);
    } else {
        var asyncContext = context.beginAsync({
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