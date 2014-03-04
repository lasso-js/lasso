var eventStream = require('event-stream');

exports.stream = true;

exports.transform = function(inStream, contentType, context) {
    if (contentType === 'css') {
        return inStream.pipe(eventStream.through(null,
            function end () { //optional
                this.queue('-CSSTransform1');
                this.queue(null);
            }));
    }
    else {
        return inStream;
    }
};

exports.name = module.id;