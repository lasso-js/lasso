var fs = require('fs');
var enabledTest = process.env.TEST;
var path = require('path');
var assert = require('assert');

function autoTest(name, dir, run, options, done) {
    options = options || {};

    var compareExt = options.compareExt;

    if (compareExt && compareExt.charAt(0) !== '.') {
        compareExt = '.' + compareExt;
    }

    var actualPath = path.join(dir, 'actual' + compareExt);
    var expectedPath = path.join(dir, 'expected' + compareExt);

    run(dir, function(err, actual) {
        if (err) {
            return done(err);
        }

        if (!compareExt) {
            return done();
        }

        fs.writeFileSync(actualPath, compareExt === '.json' ? JSON.stringify(actual, null, 4) : actual, {encoding: 'utf8'});

        var expected;

        try {
            expected = fs.readFileSync(expectedPath, { encoding: 'utf8' });
        } catch(e) {
            expected = compareExt === '.json' ? '"TBD"' : 'TBD';
            fs.writeFileSync(expectedPath, expected, {encoding: 'utf8'});
        }

        if (compareExt === '.json') {
            var expectedObject = JSON.parse(expected);

            // Remove functions from the object
            if (!actual) {
                throw new Error(`Actual is not valid for ${name}`);
            }
            actual = JSON.parse(JSON.stringify(actual));

            try {
                assert.deepEqual(
                    actual,
                    expectedObject);
            } catch(e) {
                // var actualJSON = JSON.stringify(actual, null, 4);
                // var expectedJSON = JSON.stringify(expectedObject, null, 4);
                //
                // console.error('Unexpected output for "' + name + '":\nEXPECTED (' + expectedPath + '):\n---------\n' + expectedJSON +
                //     '\n---------\nACTUAL (' + actualPath + '):\n---------\n' + actualJSON + '\n---------');
                throw new Error('Unexpected output for "' + name + '"');
            }
        } else {
            if (actual !== expected) {
                throw new Error('Unexpected output for "' + name + '"');
            }
        }

        done();
    });

    // assert.deepEqual(
    //     actual,
    //     expected,
    //     'Unexpected output for "' + name + '":\nEXPECTED (' + expectedPath + '):\n---------\n' + expectedJSON +
    //     '\n---------\nACTUAL (' + actualPath + '):\n---------\n' + actualJSON + '\n---------');
}

exports.scanDir = function(autoTestDir, run, options) {
    describe('autotest', function() {
        fs.readdirSync(autoTestDir)
            .forEach(function(name) {
                if (name.charAt(0) === '.') {
                    return;
                }

                var itFunc = it;

                if (enabledTest && name === enabledTest) {
                    itFunc = it.only;
                }

                var dir = path.join(autoTestDir, name);

                itFunc(`[${name}] `, function(done) {
                    autoTest(name, dir, run, options, done);
                });

            });
    });
};