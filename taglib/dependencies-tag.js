module.exports = function render(input, context) {
    if (input.invokeBody) {
        input.invokeBody();
    }
};