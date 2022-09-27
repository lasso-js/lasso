'use strict';

const fs = require('fs');
const nodePath = require('path');
const expect = require('chai').expect;

exports.check = async function(lasso, helpers) {
    lasso.configure({
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        outputDir: helpers.getOutputDir()
    });

    const imgPath = nodePath.join(__dirname, 'ebay.png');

    const buffer = await fs.promises.readFile(imgPath);
    const result = await lasso.lassoResource(buffer, {
        name: 'test',
        extension: 'png'
    });

    expect(result.url).to.equal('/static/test-cf6691ad.png');
};
