const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const LassoPageResult = require('../../lib/LassoPageResult');

const readFileAsync = promisify(fs.readFile);

describe('LassoPageResult test', function () {
    it('should deserialize from a reader stream', async () => {
        const filePath = path.resolve(__dirname, '../fixtures/file.json');

        let fileContents = await readFileAsync(filePath, { encoding: 'utf8' });
        fileContents = JSON.parse(fileContents);
        let lassoPageResult = new LassoPageResult();
        lassoPageResult = Object.assign(lassoPageResult, fileContents);

        const reader = () => fs.createReadStream(filePath);
        const result = await LassoPageResult.deserialize(reader);

        expect(result).to.deep.equal(lassoPageResult);
    });
});
