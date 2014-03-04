var eventStream = require('event-stream');

exports.stream = true;

exports.transform = function(inStream, contentType, context) {
    if (!inStream) {
        throw new Error('inStream expected');
    }
    
    if (contentType === 'js') {
        var code = '';

        return inStream.pipe(eventStream.through(function write(data) {
                code += data;
            },
            function end () {
                setTimeout(function() {
                    this.queue(code + '-JavaScriptTransform1Async');
                    this.queue(null);
                }.bind(this), 200);
            }));
    }
    else {
        return inStream;
    }
};

exports.name = module.id;