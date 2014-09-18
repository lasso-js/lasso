var inspect = require('util').inspect;
var ok = require('assert').ok;
var DeferredReadable = require('./util').DeferredReadable;
var PassThrough = require('stream').PassThrough;
var through = require('through');

function handleNonStreamTransform(stream, transform, applyTransform, handleError) {
    var code = '';
    return through(
        function write(data) {
            code += data;
        },
        function end() {
            var out = this;

            function handleTransformedCode(transformedCode) {
                out.queue(transformedCode);
                out.queue(null);
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
}

function applyTransforms(transforms, inStream, contentType, context, dependency) {
    ok(context, 'context is required');
    ok(inStream, 'inStream is required');
    var config = context.config;
    ok(config, 'config expected in context');

    transforms = transforms.filter(function(transform) {
        return transform.contentType == null || transform.contentType === contentType;
    });

    if (transforms.length === 0) {
        // If there are no transforms then just return the input stream
        return inStream;
    }

    function applyTransform(input, transform, callback) {
        return transform.transform(input, contentType, context, callback);
    }

    return new DeferredReadable(function() {
        var deferredStream = this;

        function handleError(e) {
            deferredStream.emit('error', e);
            deferredStream.push(null); // End the stream just in case
        }

        inStream.on('error', handleError);

        var passThrough = new PassThrough({encoding: 'utf8'});

        var out = passThrough;

        for (var i=0, len=transforms.length; i<len; i++) {
            var transform = transforms[i];


            if (transform.stream === true) {
                // applyTransform will return a new stream that we can read from
                out = applyTransform(out, transform);

                if (typeof out.pipe !== 'function') {
                    return handleError(new Error('Non-stream object returned from transform (transform=' + inspect(transform) + ', output=' + inspect(out) + ')'));
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

exports.applyTransforms = applyTransforms;
