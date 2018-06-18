'use strict';

const promisify = require('pify');
const fs = require('fs');
const nodePath = require('path');
const expect = require('chai').expect;
const readFileAsync = promisify(fs.readFile);

exports.check = async function(lasso, helpers) {
    lasso.configure({
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        outputDir: helpers.getOutputDir()
    });

    const imgPath = nodePath.join(__dirname, 'ebay.png');

    const buffer = await readFileAsync(imgPath);
    const result = await lasso.lassoResource(buffer, {
        extension: 'png'
    });

    expect(result.url).to.equal('/static/cf6691ad.png');
};
