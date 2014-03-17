var eventStream = require('event-stream');
var promises = require('raptor-promises');
var inspect = require('util').inspect;
var ok = require('assert').ok;

function applyTransforms(inStream, contentType, context) {
    ok(context, 'context is required');
    ok(inStream, 'inStream is required');
    var config = context.config;
    ok(config, 'config expected in context');

    var transforms = context.config.getTransforms();


    if (!transforms || transforms.length === 0) {
        return inStream;
    }

    

    function applyTransform(input, transform) {
        var output = transform.transform(input, contentType, context);

        if (output == null) {
            output = input;
        }

        return output;
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
        }
        else {
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

                    try {
                        var transformedCode = applyTransform(code, transform);
                        promises.resolved(transformedCode)
                            .then(function(transformedCode) {
                                through.queue(transformedCode);
                                through.queue(null);
                            })
                            .fail(handleError);
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