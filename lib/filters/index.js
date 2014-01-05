var promises = require('raptor-promises');

function applyFilters(code, contentType, context) {

    if (code == null) {
        throw new Error('"code" argument is required');
    }

    var promiseChain = promises.makePromise(code);


    var filters = context.config.getFilters();


    if (!filters || filters.length === 0) {
        return promiseChain;
    }

    filters.forEach(function(filter) {
        if (filter.contentType && filter.contentType !== contentType) {
            return;
        }
        
        function applyFilter(code) {
            var output = filter.filter(code, contentType, context);
            if (output != null) {
                code = output;
            }

            return code;
        }

        promiseChain = promiseChain.then(applyFilter);
    }, this);

    return promiseChain;
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