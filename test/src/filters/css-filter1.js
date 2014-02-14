var eventStream = require('event-stream');

exports.stream = true;

exports.filter = function(inStream, contentType, context) {
    if (contentType === 'text/css') {
        return inStream.pipe(eventStream.through(null,
            function end () { //optional
                this.queue('-CSSFilter1');
                this.queue(null);
            }));
    }
    else {
        return inStream;
    }
};

exports.name = module.id;