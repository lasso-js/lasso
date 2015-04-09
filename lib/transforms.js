var inspect = require('util').inspect;
var ok = require('assert').ok;
var equal = require('assert').equal;
var DeferredReadable = require('./util').DeferredReadable;
var PassThrough = require('stream').PassThrough;
var through = require('through');
var async = require('async');

function Transformer(transforms) {
    this.transforms = transforms;
}

function handleNonStreamTransform(inStream, transform, applyTransform, handleError) {
    var code = '';

    var outStream = through(
        function write(data) {
            code += data;
        },
        function end() {
            function handleTransformedCode(transformedCode) {
                outStream.push(transformedCode);
                outStream.push(null);
            }

            var transformedCode = applyTransform(code, transform, function(err, transformedCode) {
                if (err) {
                    return handleError(err);
                }

                handleTransformedCode(transformedCode);
            });

            if (transformedCode != null) {
                if (typeof transformedCode === 'string') {
                    handleTransformedCode(transformedCode);
                } else if (typeof transformedCode.then === 'function') {
                    transformedCode
                        .then(function(transformedCode) {
                            handleTransformedCode(transformedCode);
                        })
                        .fail(handleError)
                        .done();
                } else {
                    handleError(new Error('Invalid return for transform: ' + transformedCode));
                }
            }
        });

    return outStream;
}

Transformer.prototype = {
    hasTransforms: function() {
        return this.transforms.length !== 0;
    },

    transform: function (inStream, lassoContext) {
        var transforms = this.transforms;

        if (!transforms.length) {
            return inStream;
        }

        ok(lassoContext, 'lassoContext is required');
        ok(inStream, 'inStream is required');
        var config = lassoContext.config;
        ok(config, 'config expected in context');

        function applyTransform(input, transform, callback) {
            return transform.transform(input, lassoContext, callback);
        }

        return new DeferredReadable(function() {
            var deferredStream = this;

            function handleError(e) {
                deferredStream.emit('error', e);
                deferredStream.push(null); // End the stream just in case
            }

            inStream.on('error', handleError);

            var passThrough = new PassThrough();

            var out = passThrough;

            for (var i=0, len=transforms.length; i<len; i++) {
                var transform = transforms[i];

                if (transform.stream === true) {
                    // applyTransform will return a new stream that we can read from
                    out = applyTransform(out, transform);

                    if (typeof out.pipe !== 'function') {
                        return handleError(
                            new Error('Non-stream object returned from transform (transform=' +
                            inspect(transform) + ', output=' + inspect(out) + ')'));
                    }
                } else {
                    // The transform doesn't want a stream so we have to do some additional processing...
                    out = out.pipe(handleNonStreamTransform(out, transform, applyTransform, handleError));
                }

                out.on('error', handleError);
            }

            // Add some listeners to the output stream returned by the final transform

            out.on('data', function(data) {
                deferredStream.push(data);
            });

            out.on('end', function() {
                deferredStream.push(null);
            });


            // Now start the flow of data at the source by piping the input stream
            // to the beginning of our transform chain (i.e. the initial pass thorugh stream)
            inStream.pipe(passThrough);

        });
    }
};

exports.createTransformer = function(unfilteredTransforms, lassoContext, callback) {

    equal(typeof callback, 'function', 'callback function expected');

    if (unfilteredTransforms) {
        ok(Array.isArray(unfilteredTransforms), 'unfilteredTransforms should be an array');
    }

    var contentType = lassoContext.contentType;
    ok(typeof contentType === 'string', '"contentType" is required');

    var completed = false;

    function done(err, filteredTransforms) {
        if (completed) {
            return;
        }

        completed = true;

        if (err) {
            return callback(err);
        }

        var transformer = new Transformer(filteredTransforms);
        callback(null, transformer);
    }

    function filter(transformConfig, callback) {
        if (transformConfig.filter) {
            transformConfig.filter(lassoContext, function(err, keep) {
                if (err) {
                    return done(err);
                }
                return callback(keep);
            });
        } else {
            callback(true);
        }
    }

    async.filter(
        unfilteredTransforms,
        filter,
        function(filteredTransforms) {
            done(null, filteredTransforms);
        });
};
