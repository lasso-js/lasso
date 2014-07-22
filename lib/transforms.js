var eventStream = require('event-stream');
var inspect = require('util').inspect;
var ok = require('assert').ok;
var logger = require('raptor-logging').logger(module);

function applyTransforms(inStream, contentType, context) {
    ok(context, 'context is required');
    ok(inStream, 'inStream is required');
    var config = context.config;
    ok(config, 'config expected in context');

    var transforms = context.config.getTransforms();

    if (!transforms || transforms.length === 0) {
        logger.debug('No transforms');
        return inStream;
    }

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
            var dest = eventStream.through(function write(data) {
                    code += data;
                },
                function end() {
                    var through = this;
                    function handleError(e) {
                        through.emit('error', e);
                    }

                    function handleTransformedCode(transformedCode) {
                        process.nextTick(function() {
                            through.queue(transformedCode);
                            through.queue(null);
                        });
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