function applyPatch() {
    var CombinedStream = require('combined-stream');
    if (CombinedStream.__patchedReturns) {
        return;
    }

    CombinedStream.__patchedReturns = true;

    var oldPipe = CombinedStream.prototype.pipe;

    (['pause', 'resume', 'destroy']).forEach(function(methodName) {
        var old = CombinedStream.prototype[methodName];
        CombinedStream.prototype[methodName] = function() {
            old.apply(this, arguments);
            return this;
        };
    });

    CombinedStream.prototype.pipe = function(dest, options) {
        oldPipe.apply(this, arguments);
        return dest;
    };
}

exports.applyPatch = applyPatch;