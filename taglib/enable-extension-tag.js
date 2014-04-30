var optimizer = require('../');
        
module.exports = function render(input, context) {
    optimizer.enableExtensionForContext(context, input.name);
};