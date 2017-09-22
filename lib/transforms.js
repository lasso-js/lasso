var inspect = require('util').inspect;
var ok = require('assert').ok;
var DeferredReadable = require('./util').DeferredReadable;
var PassThrough = require('stream').PassThrough;
var through = require('through');

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

            var transformedCode = applyTransform(code, transform);

            if (transformedCode != null) {
                if (typeof transformedCode === 'string') {
                    handleTransformedCode(transformedCode);
                } else if (typeof transformedCode.then === 'function') {
                    transformedCode
                        .then(function(transformedCode) {
                            handleTransformedCode(transformedCode);
                        })
                        .catch(handleError);
                } else {
                    handleError(new Error('Invalid return for transform: ' + transformedCode));
                }
            }
        });

    return outStream;
}

Transformer.prototype = {
    hasTransforms () {
        return this.transforms.length !== 0;
    },

    transform (inStream, lassoContext) {
        var transforms = this.transforms;

        if (!transforms.length) {
            return inStream;
        }

        ok(lassoContext, 'lassoContext is required');
        ok(inStream, 'inStream is required');
        var config = lassoContext.config;
        ok(config, 'config expected in context');

        function applyTransform(input, transform) {
            return transform.transform(input, lassoContext);
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

            for (var i = 0, len = transforms.length; i < len; i++) {
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

async function filterTransform (lassoContext, transformConfig) {
    return transformConfig.filter ? transformConfig.filter(lassoContext) : true;
}

exports.createTransformer = async function (unfilteredTransforms, lassoContext) {
    if (unfilteredTransforms) {
        ok(Array.isArray(unfilteredTransforms), 'unfilteredTransforms should be an array');
    }

    var contentType = lassoContext.contentType;
    ok(typeof contentType === 'string', '"contentType" is required');

    const filteredTransforms = [];
    for (const unfilteredTransform of unfilteredTransforms) {
        const keep = await filterTransform(lassoContext, unfilteredTransform);
        if (keep) {
            filteredTransforms.push(unfilteredTransform);
        }
    }

    return new Transformer(filteredTransforms);
};
