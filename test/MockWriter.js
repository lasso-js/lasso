var raptorUtil = require('raptor-util');
var eventStream = require('event-stream');
var nodePath = require('path');

function MockWriter(config) {
    config.outputDir = nodePath.resolve(__dirname, config.outputDir);
    MockWriter.$super.apply(this, arguments);
    this.outputFilesByPath = {};
    this.outputFilesByName = {};
    this.__MockWriter = true;
}

MockWriter.prototype = {
    _recordOutputFile: function(outputFile) {

        var _this = this;

        var code = '';
        return eventStream.through(function write(data) {
                code += data;
            },
            function end() {
                _this.outputFilesByPath[outputFile] = code;
                _this.outputFilesByName[nodePath.basename(outputFile)] = code;
                this.emit('close');
            });


        
    },

    getBundleFileOutputStream: function(outputFile) {
        return this._recordOutputFile(outputFile);
    },

    getResourceFileOutputStream: function(outputFile) {
        return this._recordOutputFile(outputFile);
    },

    getOutputPaths: function() {
        var paths = Object.keys(this.outputFilesByPath);
        paths.sort();
        return paths;
    },

    getOutputFilenames: function() {
        var filenames = Object.keys(this.outputFilesByName);
        filenames.sort();
        return filenames;
    },

    getCodeForFilename: function(filename) {
        return this.outputFilesByName[filename];
    },

    toString: function() {
        return '[MockWriter@' + module.filename + ']';
    }
};

raptorUtil.inherit(MockWriter, require('../lib/writers/FileWriter'));

MockWriter.create = function(config) {
    return new MockWriter(config);
};

module.exports = MockWriter;