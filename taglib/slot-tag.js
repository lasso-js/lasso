var util = require('./util');

function renderSlot(slotName, optimizedPage, context, lassoContext) {
    var slotHtml = optimizedPage.getSlotHtml(slotName);

    if (slotHtml) {
        context.write(slotHtml);
    }

    lassoContext.emitAfterSlot(slotName, context);
}

module.exports = function render(input, context) {
    var slotName = input.name;
    var lassoRenderContext = util.getOptimizerRenderContext(context);
    var optimizedPageDataHolder = lassoRenderContext.data.optimizedPage;
    var timeout = lassoRenderContext.data.timeout;

    if (!optimizedPageDataHolder) {
        throw new Error('Optimized page not found for slot "' + slotName + '". The <lasso-page> tag should be used to generate the optimized page.');
    }

    lassoRenderContext.emitBeforeSlot(slotName, context);

    if (optimizedPageDataHolder.isResolved()) {
        renderSlot(slotName, optimizedPageDataHolder.data, context, lassoRenderContext);
    } else {
        var asyncContext = context.beginAsync({
            name: 'lasso-slot:' + slotName,
            timeout: timeout
        });

        optimizedPageDataHolder.done(function(err, optimizedPage) {
            if (err) {
                // logger.error('Optimizer "' + slotName + '" slot failed.', err);
                asyncContext.error(err);
                return;
            }

            renderSlot(slotName, optimizedPage, asyncContext, lassoRenderContext);
            asyncContext.end();
        });
    }
};