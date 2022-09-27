var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.checkError = function(e) {
    var errorString = e.toString();
    expect(errorString).to.contain('Failed to walk dependency [require: ./b]');
    expect(errorString).to.contain('Dependency chain: [require: ./main] → [require: ./a] → [require: ./b]');
    expect(errorString).to.contain('Error: Module not found: ./c (from "test/autotests/modules/missing-module" and referenced in "test/autotests/modules/missing-module/b.js")');
};
