var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ],
        flags: ['mobile']
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.foo.isMobile).to.equal(true);
    expect(window.main.bar.isDesktop).to.equal(false);
};