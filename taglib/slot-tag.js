var optimizer = require('../');
var logger = require('raptor-logging').logger(module);

function renderSlot(slotName, optimizedPage, context, optimizerContext) {
    var slotHtml = optimizedPage.getSlotHtml(slotName);

    if (slotHtml) {
        context.write(slotHtml);
    }

    optimizerContext.emitAfterSlot(slotName, context);
}

module.exports = function render(input, context) {
    var slotName = input.name;
    
    var optimizedPageDataHolder = context.attributes.optimizedPage;
    var optimizerContext = optimizer.getRenderContext(context);

    if (!optimizedPageDataHolder) {
        throw new Error('Optimized page not found for slot "' + slotName + '". The <optimizer-page> tag should be used to generate the optimized page.');
    }

    optimizerContext.emitBeforeSlot(slotName, context);


    if (optimizedPageDataHolder.isResolved()) {
        renderSlot(slotName, optimizedPageDataHolder.data, context, optimizerContext);
    } else {
        var asyncContext = context.beginAsync();
        
        optimizedPageDataHolder.done(function(err, optimizedPage) {
            if (err) {
                logger.error('Optimizer "' + slotName + '" slot failed.', err);
                asyncContext.error(err);
                return;
            }

            renderSlot(slotName, optimizedPage, asyncContext, optimizerContext);
            asyncContext.end();
        });
    }   
};