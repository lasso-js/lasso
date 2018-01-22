require('../util/test-init');

const expect = require('chai').expect;
const hashUtil = require('lasso/util/hash');

describe('Hash test', function () {
    it('should generate full sha1 hash', () => {
        expect(hashUtil.generate('cats')).to.equal('8ebf601f8b808c32b8d2fb570c2e0fbdbb388add');
    });

    it('should return substring of generated hash', () => {
        expect(hashUtil.generate('cats', 5)).to.equal('8ebf6');
    });

    it('should return currect hash overflow', () => {
        expect(hashUtil.HASH_OVERFLOW_LENGTH).to.equal(8);
    });
});
