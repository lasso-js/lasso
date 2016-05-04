var through = require('through');

exports.stream = true;

exports.transform = function(inStream, context) {
    var contentType = context.contentType;
    
    if (!inStream) {
        throw new Error('inStream expected');
    }

    if (contentType === 'js') {
        var code = '';

        return inStream.pipe(through(function write(data) {
                code += data;
            },
            function end () {
                setTimeout(function() {
                    this.queue(code + '-JavaScriptTransform1Async');
                    this.queue(null);
                }.bind(this), 100);
            }));
    }
    else {
        return inStream;
    }
};

exports.name = module.id;