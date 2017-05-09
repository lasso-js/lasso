'use strict';

class MockMemoryCache {
    constructor() {
        this.lookup = {};
    }

    get(key, options) {
        var lookup = this.lookup;

        var lastModified = options && options.lastModified;
        if (!lastModified || lastModified < 0) {
            lastModified = null;
        }

        var entry = lookup[key];
        if (entry && lastModified && entry.lastModified !== lastModified) {
            entry = null;
        }

        var value;

        if (!entry && options.builder) {
            value = options.builder();
            entry = {
                value: value,
                lastModified: lastModified
            };

            lookup[key] = entry;
        }

        return Promise.resolve(value);
    }
}

module.exports = MockMemoryCache;