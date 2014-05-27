var extend = require('raptor-util').extend;

module.exports = function render(input, context) {
    var dependenciesParent = input.dependenciesParent;
    if (!dependenciesParent) {
        throw new Error('Expected property "dependenciesParent"');
    }

    delete input.dependenciesParent;

    var dependency = extend({}, input['*']);

    dependenciesParent.addDependency(dependency);
};