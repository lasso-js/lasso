var expect = require('chai').expect;

exports.tests = [
    {
        lassoOptions: {
            dependencies: [
                'require-run: ./main'
            ],
            flags: ['mobile']
        },
        check: function(window) {
            expect(window.main.filename).to.contain('main');
            expect(window.main.foo.isMobile).to.equal(true);
            expect(window.main.bar.isDesktop).to.equal(false);
        }
    },
    {
        lassoOptions: {
            dependencies: [
                'require-run: ./main'
            ],
            flags: ['desktop']
        },
        check: function(window) {
            expect(window.main.filename).to.contain('main');
            expect(window.main.foo.isMobile).to.equal(false);
            expect(window.main.bar.isDesktop).to.equal(true);
        }
    }
];