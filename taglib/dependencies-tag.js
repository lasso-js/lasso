module.exports = function render(input, out) {
    if (input.renderBody) {
        input.renderBody(out);
    }
};