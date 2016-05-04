var through = require('through');

exports.stream = true;

exports.transform = function(inStream, context) {
    var contentType = context.contentType;

    if (contentType === 'css') {
        return inStream.pipe(through(null,
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