var through = require('through');
var inspect = require('util').inspect;
var ok = require('assert').ok;
var logger = require('raptor-logging').logger(module);

function applyTransforms(transforms, inStream, contentType, context, dependency) {
    ok(context, 'context is required');
    ok(inStream, 'inStream is required');
    var config = context.config;
    ok(config, 'config expected in context');

    // TODO: Assume that given transforms are all applicable (no need to filter)
    // TODO: Use DeferredStream to avoid emitting errors before we are ready to handle them
    function applyTransform(input, transform, callback) {
        return transform.transform(input, contentType, context, callback);
    }

    var out = inStream;
    transforms.forEach(function(transform) {
        if (transform.contentType && transform.contentType !== contentType) {
            return;
        }

        if (transform.stream === true) {
            // applyTransform will return a new stream that we can read from
            out = applyTransform(out, transform);

            if (typeof out.pipe !== 'function') {
                throw new Error('Non-stream object returned from transform (transform=' + inspect(transform) + ', output=' + inspect(out) + ')');
            }
        } else {
            
            // The transform doesn't want a stream so lets convert the stream to a string
            var code = '';
            var dest = through(
                function write(data) {
                    code += data;
                },
                function end() {
                    var dest = this;

                    function handleError(e) {
                        logger.error('Error applying transform to dependency ' + dependency, e);
                        // TODO: This doesn't work well because we might not have a listener yet
                        out.emit('error', e);
                    }

                    function handleTransformedCode(transformedCode) {
                        dest.queue(transformedCode);
                        dest.queue(null);
                    }

                    try {
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
                                    .fail(handleError);
                            } else {
                                throw new Error('Invalid return for transform: ' + transformedCode);
                            }
                            
                        }
                    }
                    catch(e) {
                        handleError(e);
                    }
                    
                });

            // put the stream we are outputting to in a paused state
            dest.pause();

            // Forward errors along
            out.on('error', function(e) {
                dest.emit('error', e);
            });

            out = out.pipe(dest);
        }
    }, this);
    
    return out;
}

exports.applyTransforms = applyTransforms;