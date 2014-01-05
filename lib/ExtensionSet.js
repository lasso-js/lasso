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
 * The ExtensionSet class is used to maintain a set
 * of extensions and provides methods for adding
 * extension names and checking if an extension
 * is an enabled. It also exposes a <code>getKey()</code>
 * method that can be used to return a String
 * key that uniquely identifies the set of
 * enabled extensions.
 */
var forEachEntry = require('raptor-util').forEachEntry;
var raptorRegexp = require('raptor-regexp');

var ExtensionSet = function(extensions) {
    this.extensionsLookup = {};
    this.extensionsArray = [];
    this.key = null;
    
    this.addAll(extensions);
};

ExtensionSet.prototype = {
    __ExtensionSet: true,

    isEmpty: function() {
        return this.extensionsArray.length === 0;
    },
    
    /**
     * 
     * @param ext
     */
    add: function(ext) {
        if (typeof ext !== 'string') {
            this.addAll(ext);
            return;
        }
        
        this.extensionsLookup[ext] = true; //Add the extension to a map for quick lookup
        this.extensionsArray.push(ext); //Maintain an array of extensions
        this.key = null; //Clear out the key so that it is regenerated since the collection changed
    },
    
    remove: function(ext) {
        if (this.extensionsLookup[ext]) {
            delete this.extensionsLookup[ext];
            this.extensionsArray = Object.keys(this.extensionsLookup);
            this.key = null; //Clear the key since the collection changed
        }
    },
    
    /**
     * Adds one or more extensions to the collection. This method
     * supports an array of extension names, as well as an
     * object map with extension names as property names.
     * 
     * @param extensions {Array|Object|packaging.ExtensionSet}
     */
    addAll: function(extensions) {
        if (!extensions) {
            return;
        }
        
        if (extensions instanceof ExtensionSet) {
            extensions = extensions.extensionsArray;
        } 

        if (Array.isArray(extensions)) {
            extensions.forEach(function(ext) {
                this.add(ext);
            }, this);
        }
        else if (typeof extensions === 'object') {
            forEachEntry(extensions, function(ext) {
                this.add(ext);
            }, this);
        }
        
    },
    
    /**
     * Returns a string that can be used to uniquely
     * identify a set of extensions. If two 
     * ExtensionSet instances contain the same set
     * of extensions then the same key will be returned.
     * @returns
     */
    getKey: function() {
        
        if (this.key == null) { 
            this.extensionsArray.sort();
            this.key = this.extensionsArray.join("|");
        }
        
        return this.key;
    },
    
    /**
     * 
     * @param ext
     * @returns {Boolean}
     */
    contains: function(ext) {
        return this.extensionsLookup[ext] === true;
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
        else if (ext === "*") {
            return this.extensionsArray.length !== 0;
        }
        else {
            regExp = raptorRegexp.simple(ext);
        }
        
        var extensions = this.extensionsArray;
        for (var i=0, len=extensions.length; i<len; i++) {
            if (regExp.test(extensions[i])) {
                return true;
            }
        }
        
        return false;
    },

    toString: function() {
        return this.getKey();
    }
};

module.exports = ExtensionSet;