var eventStream = require('event-stream');
var promises = require('raptor-promises');
var inspect = require('util').inspect;
var ok = require('assert').ok;

function applyFilters(inStream, contentType, context) {
    ok(context, 'context is required');
    ok(inStream, 'inStream is required');
    var config = context.config;
    ok(config, 'config expected in context');

    var filters = context.config.getFilters();


    if (!filters || filters.length === 0) {
        return inStream;
    }

    

    function applyFilter(input, filter) {
        var output = filter.filter(input, contentType, context);

        if (output == null) {
            output = input;
        }

        return output;
    }

    var out = inStream;
    filters.forEach(function(filter) {
        if (filter.contentType && filter.contentType !== contentType) {
            return;
        }

        if (filter.stream === true) {
            // applyFilter will return a new stream that we can read from
            out = applyFilter(out, filter);

            if (typeof out.pipe !== 'function') {
                throw new Error('Non-stream object returned from filter (filter=' + inspect(filter) + ', output=' + inspect(out) + ')');
            }
        }
        else {
            // The filter doesn't want a stream so lets convert the stream to a string
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
                        var filteredCode = applyFilter(code, filter);
                        promises.resolved(filteredCode)
                            .then(function(filteredCode) {
                                through.queue(filteredCode);
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

var filtersByName = {};

function getFilter(name) {
    var filter = filtersByName[name];
    if (!filter) {
        throw new Error('Filter not found with name "' + name +
            '". Registered filters: [' + Object.keys(filtersByName).join(',') + ']');
    }
    return filter;
}

function registerFilter(name, filter) {
    filtersByName[name] = filter;
}

registerFilter('minify-css', require('./minify-css-filter'));
registerFilter('minify-js', require('./minify-js-filter'));
registerFilter('resolve-css-urls', require('./resolve-css-urls-filter'));

exports.applyFilters = applyFilters;
exports.get = getFilter;
exports.register = registerFilter;