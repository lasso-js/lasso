var optimizer = require('../');
        
module.exports = function render(input, context) {
    optimizer.disableExtensionForContext(context, input.name);
};