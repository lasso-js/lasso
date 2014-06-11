/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logger = require('raptor-logging').logger(module);
var EventEmitter = require('events').EventEmitter;

var includeStack = false;

var voidWriter = {
    write: function() {}
};

function BufferedWriter() {
    this.bufferedData = [];
}

BufferedWriter.prototype = {
    write: function(data) {
        this.bufferedData.push(data);
    },
    flush: function(out) {
        var bufferedData = this.bufferedData;
        for (var i=0, len=bufferedData.length; i<len; i++) {
            out.write(bufferedData[i]);
        }
        bufferedData.length = 0;
    }
};

function onProxy(context, type, event, callback) {
    var attributes = context.attributes;

    if (event === 'end') {
        if (attributes.ended) {
            callback();
            return context;
        }
    }

    var events = attributes.events;
    events[type](event, callback);
    return context;
}

function Chunk(context) {
    this.context = context;
    // The context that this async fragment is associated with
    this.writer = context.writer;
    // The original writer this fragment was associated with
    this.finished = false;
    // Used to keep track if this async fragment was ended
    this.flushed = false;
    // Set to true when the contents of this async fragment have been
    // flushed to the original writer
    this.next = null;
    // A link to the next sibling async fragment (if any)
    this.ready = true;    // Will be set to true if this fragment is ready to be flushed
                          // (i.e. when there are no async fragments preceeding this fragment)
}
function flushNext(fragment, writer) {
    var next = fragment.next;
    if (next) {
        next.ready = true;
        // Since we have flushed the next fragment is ready
        next.writer = next.context.writer = writer;
        // Update the next fragment to use the original writer
        next.flush();    // Now flush the next fragment (if it is not finish then it will just do nothing)
    }
}
function BufferedChunk(context, buffer) {
    Chunk.call(this, context);
    this.buffer = buffer;
}
BufferedChunk.prototype = {
    flush: function () {
        var writer = this.writer;
        var buffer = this.buffer;
        buffer.flush(writer); // Copy out the buffered data to the output writer
        this.flushed = true;
        flushNext(this, writer);
    }
};

function AsyncChunk(context) {
    Chunk.call(this, context);
}

AsyncChunk.prototype = {
    end: function () {
        if (!this.finished) {
            // Make sure end is only called once by the user
            this.finished = true;

            

            if (this.ready) {
                // There are no nested asynchronous fragments that are
                // remaining and we are ready to be flushed then let's do it!
                this.flush();
            }
        }
    },
    flush: function () {
        if (!this.finished) {
            // Skipped Flushing since not finished
            return;
        }
        this.flushed = true;
        var writer = this.writer;
        this.writer = this.context.writer = voidWriter; // Prevent additional out-of-order writes
        flushNext(this, writer);
    }
};



function AsyncDataContext(writer, attributes) {
    this.attributes = attributes || (attributes = {});
    this._af = this._prevChunk = this._parentChunk = null;

    if (!attributes.events) {
        attributes.events = new EventEmitter();
    }

    if (!attributes.async) {
        if (writer && writer.end) {
            this.on('end', function() {
                writer.end();
            });
        }

        attributes.async = {
            remaining: 0,
            ended: false,
            last: 0,
            lastFlushSupported: this.lastFlushSupported !== false
        };
    }

    if (!writer) {
        writer = new BufferedWriter();
    }

    this.writer = this.stream = writer;
}

AsyncDataContext.prototype = {
    constructor: AsyncDataContext,

    write: function (data) {
        if (data == null) {
            this.end();
        } else {
            this.writer.write(data);    
        }
        
        return this;
    },
    createNestedAsyncDataContext: function (writer) {
        return new AsyncDataContext(writer, this.attributes);
    },
    beginAsync: function (options) {
        // Keep a count of all of the async fragments for this rendering
        

        var ready = true;

        // Create a new context that the async fragment can write to.
        // The new async context will use the existing writer and 
        // the writer for the current context (which will continue to be used)
        // will be replaced with a string buffer writer
        var nestedAsyncDataContext = new AsyncDataContext(this.writer, this.attributes);
        var buffer = this.writer = new BufferedWriter();
        var asyncChunk = new AsyncChunk(nestedAsyncDataContext);
        var bufferedChunk = new BufferedChunk(this, buffer);
        asyncChunk.next = bufferedChunk;
        nestedAsyncDataContext._af = asyncChunk;
        nestedAsyncDataContext._parentChunk = asyncChunk;
        var prevAsyncChunk = this._prevChunk || this._parentChunk;
        // See if we are being buffered by a previous asynchronous
        // fragment
        if (prevAsyncChunk) {
            // Splice in our two new fragments and add a link to the previous async fragment
            // so that it can let us know when we are ready to be flushed
            bufferedChunk.next = prevAsyncChunk.next;
            prevAsyncChunk.next = asyncChunk;
            if (!prevAsyncChunk.flushed) {
                ready = false;    // If we are preceeded by another async fragment then we aren't ready to be flushed
            }
        }
        asyncChunk.ready = ready;
        // Set the ready flag based on our earlier checks above
        this._prevChunk = bufferedChunk;
        // Record the previous async fragment for linking purposes
        

        nestedAsyncDataContext.handleBeginAsync(options);

        return nestedAsyncDataContext;
    },

    handleBeginAsync: function(options) {
        
        var async = this.attributes.async;

        var timeout;

        async.remaining++;

        if (options != null) {
            if (typeof options === 'number') {
                timeout = options;
            } else {
                timeout = options.timeout;
                if (options.last === true) {
                    async.last++;
                }
            }
        }

        if (timeout == null) {
            timeout = this.timeout || 0;
        }

        var _this = this;

        _this.stack = includeStack ? new Error().stack : null;

        if (timeout > 0) {
            _this._timeoutId = setTimeout(function() {
                _this.error(new Error('Async fragment timed out after ' + timeout + 'ms'));
            }, timeout);
        }
    },
    on: function(event, callback) {
        return onProxy(this, 'on', event, callback);
    },

    once: function(event, callback) {
        return onProxy(this, 'once', event, callback);
    },

    emit: function(event) {
        var attributes = this.attributes;

        if (event === 'end') {
            attributes.ended = true;
        }

        var events = attributes.events;
        events.emit.apply(events, arguments);
        return this;
    },

    pipe: function(stream) {
        this.stream.pipe(stream);
        return this;
    },

    error: function(e) {
        try {
            var stack = this.stack;
            logger.error('Async fragment failed. Exception: ' + (e.stack || e) + (stack ? ('\nCreation stack trace: ' + stack) : ''));
            this.emit('error', e); 
        } finally {
             this.end();
        }
    },

    end: function(data) {
        if (data) {
            this.write(data);
        }

        var asyncChunk = this._af;

        if (asyncChunk) {
            asyncChunk.end();
            this.handleEnd(true);
        } else {
            this.handleEnd(false);
        }

        return this;
    },

    handleEnd: function(isAsync) {

        var async = this.attributes.async;
        var isCompleted = false;

        // Keep track of how many asynchronous fragments are in the template
        // NOTE: firstPassComplete changes to true after processing all of the nodes of the template
        if (isAsync) {
            var timeoutId = this._timeoutId;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (--async.remaining - async.last === 0 && async.ended) {
                isCompleted = true;
            }    
        } else {
            async.ended = true;

            if (async.remaining - async.last === 0) {
                isCompleted = true;
            }
        }

        if (isCompleted) {
            if (!async.lastFired) {
                this.emit('last');
                async.last = 0;
                async.lastFired = true;
            }

            if (async.remaining === 0) {
                this.emit('end');    
            }
        }
    }
};

AsyncDataContext.enableAsyncStackTrace = function() {
    includeStack = true;
};

module.exports = AsyncDataContext;