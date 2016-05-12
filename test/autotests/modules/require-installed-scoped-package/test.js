var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.bar.filename).to.contain('@foo/bar');
    expect(window.main.bar.SCOPED_BAR).to.equal(true);
};