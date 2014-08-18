var through = require('through');

exports.stream = true;

exports.transform = function(inStream, contentType, context) {
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