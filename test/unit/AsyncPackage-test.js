const sinon = require('sinon');
const expect = require('chai').expect;
const AsyncPackage = require('../../lib/AsyncPackage');
const Bundle = require('../../lib/Bundle');

describe('AsyncPackage test', function () {
    it('should return name from getName', () => {
        let asyncPkg = new AsyncPackage('pkg');
        expect(asyncPkg.getName()).to.equal('pkg');
    });

    it('should throw error if a bundle contains an invalid content type', () => {
        let asyncPkg = new AsyncPackage();
        const bundle = new Bundle();
        bundle.setContentType('INVALID_CONTENT_TYPE');
        bundle.setUrl('./hello');
        asyncPkg.addBundle(bundle);

        expect(() => {
            asyncPkg.getMeta();
        }).to.throw('Invalid bundle content type: INVALID_CONTENT_TYPE');
    });

    it('should skip adding meta if content type is not defined', () => {
        let asyncPkg = new AsyncPackage();
        const bundle = new Bundle();
        let hasContentCalled = false;
        let getUrlCalled = false;

        sinon.stub(bundle, 'hasContent').callsFake(() => {
            hasContentCalled = true;
            return false;
        });

        sinon.stub(bundle, 'getUrl').callsFake(() => {
            hasContentCalled = true;
            return true;
        });

        bundle.setUrl('./hello');
        asyncPkg.addBundle(bundle);

        expect(asyncPkg.getMeta()).to.equal({
            css: [],
            js: []
        });
    });

    it('should skip adding meta if url is not defined', () => {
        let asyncPkg = new AsyncPackage();
        const bundle = new Bundle();
        bundle.setContentType('js');
        asyncPkg.addBundle(bundle);

        expect(asyncPkg.getMeta()).to.equal({
            css: [],
            js: []
        });
    });
});
