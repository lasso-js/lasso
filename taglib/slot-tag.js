var util = require('./util');

function renderSlot(slotName, optimizedPage, context, optimizerContext) {
    var slotHtml = optimizedPage.getSlotHtml(slotName);

    if (slotHtml) {
        context.write(slotHtml);
    }

    optimizerContext.emitAfterSlot(slotName, context);
}

module.exports = function render(input, context) {
    var slotName = input.name;
    
    
    var optimizerRenderContext = util.getOptimizerRenderContext(context);
    var optimizedPageDataHolder = optimizerRenderContext.data.optimizedPage;

    if (!optimizedPageDataHolder) {
        throw new Error('Optimized page not found for slot "' + slotName + '". The <optimizer-page> tag should be used to generate the optimized page.');
    }

    optimizerRenderContext.emitBeforeSlot(slotName, context);


    if (optimizedPageDataHolder.isResolved()) {
        renderSlot(slotName, optimizedPageDataHolder.data, context, optimizerRenderContext);
    } else {
        var asyncContext = context.beginAsync({name: 'optimizer-slot:' + slotName});
        
        optimizedPageDataHolder.done(function(err, optimizedPage) {
            if (err) {
                // logger.error('Optimizer "' + slotName + '" slot failed.', err);
                asyncContext.error(err);
                return;
            }

            renderSlot(slotName, optimizedPage, asyncContext, optimizerRenderContext);
            asyncContext.end();
        });
    }
};