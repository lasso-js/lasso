require('../util/test-init');

const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const LassoPageResult = require('lasso/LassoPageResult');

describe('LassoPageResult test', function () {
    it('should deserialize from a reader stream', async () => {
        const filePath = path.resolve(__dirname, '../fixtures/file.json');

        let fileContents = await fs.promises.readFile(filePath, 'utf8');
        fileContents = JSON.parse(fileContents);
        let lassoPageResult = new LassoPageResult();
        lassoPageResult = Object.assign(lassoPageResult, fileContents);

        const reader = () => fs.createReadStream(filePath);
        const result = await LassoPageResult.deserialize(reader);

        expect(result).to.deep.equal(lassoPageResult);
    });
});
