var expect = require('chai').expect;
var fs = require('fs');
var nodePath = require('path');

exports.check = function (util) {
    var cachingStream = util.createCachingStream();

    var outputDir = nodePath.join(__dirname, 'build');

    require('../../../util').rmdirRecursive(outputDir);

    fs.mkdirSync(outputDir);

    var inFile = nodePath.join(__dirname, 'hello.txt');
    var outFile1 = nodePath.join(outputDir, 'hello-1.txt');
    var outFile2 = nodePath.join(outputDir, 'hello-2.txt');

    var readStream = fs.createReadStream(inFile);
    var outStream = fs.createWriteStream(outFile1);

    return new Promise((resolve, reject) => {
        outStream.on('close', function() {
            outStream = fs.createWriteStream(outFile2);
            outStream.on('close', function() {
                var inTxt = fs.readFileSync(inFile, {encoding: 'utf8'});
                var outFile1Txt = fs.readFileSync(outFile1, {encoding: 'utf8'});
                var outFile2Txt = fs.readFileSync(outFile2, {encoding: 'utf8'});
                expect(inTxt).to.equal(outFile1Txt);
                expect(inTxt).to.equal(outFile2Txt);
                resolve();
            });

            cachingStream.createReplayStream().pipe(outStream);
        });

        readStream.pipe(cachingStream).pipe(outStream);
    });
};
