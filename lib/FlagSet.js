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

/**
 * The FlagSet class is used to maintain a set
 * of flags and provides methods for adding
 * extension names and checking if an extension
 * is an enabled. It also exposes a <code>getKey()</code>
 * method that can be used to return a String
 * key that uniquely identifies the set of
 * enabled flags.
 */
var forEachEntry = require('raptor-util').forEachEntry;
var raptorRegexp = require('raptor-regexp');

function FlagSet(flags) {
    this.flagMap = {};
    this.flagList = [];
    this.key = null;

    if (flags) {
        this.addAll(flags);
    }
}

FlagSet.prototype = {
    __FlagSet: true,

    isEmpty: function() {
        return this.flagList.length === 0;
    },

    /**
     *
     * @param ext
     */
    add: function(ext) {
        if (Array.isArray(ext)) {
            this.addAll(ext);
            return;
        }

        this.flagMap[ext] = true; //Add the extension to a map for quick lookup
        this.flagList.push(ext); //Maintain an array of flags
        this.key = null; //Clear out the key so that it is regenerated since the collection changed
    },

    remove: function(ext) {
        if (this.flagMap[ext]) {
            delete this.flagMap[ext];
            this.flagList = Object.keys(this.flagMap);
            this.key = null; //Clear the key since the collection changed
        }
    },

    /**
     * Adds one or more flags to the collection. This method
     * supports an array of extension names, as well as an
     * object map with extension names as property names.
     *
     * @param flags {Array|Object|packaging.FlagSet}
     */
    addAll: function(flags) {
        if (!flags) {
            return;
        }

        if (flags instanceof FlagSet) {
            flags = flags.flagList;
        }

        if (Array.isArray(flags)) {
            flags.forEach(function(ext) {
                this.add(ext);
            }, this);
        }
        else if (typeof flags === 'object') {
            forEachEntry(flags, function(ext) {
                this.add(ext);
            }, this);
        }

    },

    /**
     * Returns a string that can be used to uniquely
     * identify a set of flags. If two
     * FlagSet instances contain the same set
     * of flags then the same key will be returned.
     * @returns
     */
    getKey: function() {

        if (this.key == null) {
            this.flagList.sort();
            this.key = this.flagList.join('|');
        }

        return this.key;
    },

    /**
     *
     * @param ext
     * @returns {Boolean}
     */
    contains: function(ext) {
        return this.flagMap[ext] === true;
    },

    /**
     *
     * @param ext
     * @returns {Boolean}
     */
    containsMatch: function(ext) {
        var regExp;

        if (ext instanceof RegExp) {
            regExp = ext;
        }
        else if (ext === '*') {
            return this.flagList.length !== 0;
        }
        else {
            regExp = raptorRegexp.simple(ext);
        }

        var flags = this.flagList;
        for (var i=0, len=flags.length; i<len; i++) {
            if (regExp.test(flags[i])) {
                return true;
            }
        }

        return false;
    },

    toString: function() {
        return this.getKey();
    }
};

module.exports = FlagSet;