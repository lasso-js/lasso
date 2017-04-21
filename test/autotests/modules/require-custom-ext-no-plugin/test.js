var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        require: {
            extensions: ['.js', '.foo']
        }
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};



exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.foo).to.equal(window.main.foo2);
    expect(window.main.foo.filename).to.contain('hello.foo');

};