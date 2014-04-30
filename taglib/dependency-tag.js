module.exports = function render(input, context) {
    var dependenciesParent = input.dependenciesParent;
    if (!dependenciesParent) {
        throw new Error('Expected property "dependenciesParent"');
    }

    delete input.dependenciesParent;

    dependenciesParent.addDependency(input);
};