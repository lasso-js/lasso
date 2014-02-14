var raptorPromisesUtil = require('raptor-promises/util');
var logger = require('raptor-logging').logger(module);
var optimizer = require('../');

function renderSlot(slotName, optimizedPage, context, optimizerContext) {
    var slotHtml = optimizedPage.getSlotHtml(slotName);
    
    if (slotHtml) {
        context.write(slotHtml);
    }

    optimizerContext.emitAfterSlot(slotName, context);
}

module.exports = {
    process: function(input, context) {
        var slotName = input.name;
        
        var optimizedPagePromise = context.attributes.optimizedPage;
        var optimizerContext = optimizer.getRenderContext(context);

        if (!optimizedPagePromise) {
            throw new Error('Optimized page not found for slot "' + slotName + '". The <optimizer:page> tag should be used to generate the optimized page.');
        }

        optimizerContext.emitBeforeSlot(slotName, context);

        var optimizedPage = raptorPromisesUtil.valueOfPromise(optimizedPagePromise);
        if (optimizedPage) {
            renderSlot(slotName, optimizedPage, context, optimizerContext);
        } else {
            context.beginAsyncFragment(function(asyncContext, asyncFragment) {
                return optimizedPagePromise.then(function(optimizedPage) {
                    renderSlot(slotName, optimizedPage, asyncContext, optimizerContext);
                });
            });
        }

        
    }
};