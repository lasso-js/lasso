var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function (window) {
    expect(window.fooLoaded).to.equal(undefined);
    expect(window.main.filename).to.contain('main');

    return new Promise((resolve, reject) => {
        window.main.loadFoo(function(err) {
            if (err) {
                return reject(err);
            }

            resolve();
        });
    });
};
