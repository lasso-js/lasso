var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main',
            {
                'type': 'require',
                virtualModule: {
                    path: __dirname + '/something.foo',
                    clientPath: '/virtual-module/something.foo',
                    read (lassoContext) {
                        return 'exports.hello = "world"; exports.filename = __filename;';
                    }
                }
            }
        ]
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.foo.hello).to.equal('world');
    expect(window.main.foo.filename).to.equal('/virtual-module/something.foo');
};
