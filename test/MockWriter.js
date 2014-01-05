var raptorUtil = require('raptor-util');
var listeners = require('raptor-listeners');

function MockWriter() {
    MockWriter.$super.apply(this, arguments);
    this.outputFilesByPath = {};
    this.outputFilesByName = {};
    listeners.makeObservable(this, MockWriter.prototype, ['fileWritten']);
    this.__MockWriter = true;
}

MockWriter.prototype = {
    _recordOutputFile: function(outputFile, code) {
        this.outputFilesByPath[outputFile.getAbsolutePath()] = code;
        this.outputFilesByName[outputFile.getName()] = code;
        this.publish('fileWritten', {
            file: outputFile,
            filename: outputFile.getName(),
            code: code
        });
    },

    writeBundleFile: function(outputFile, code) {
        this._recordOutputFile(outputFile, code);
    },

    writeResourceFile: function(outputFile, data) {
        this._recordOutputFile(outputFile, data);
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
    }
};

raptorUtil.inherit(MockWriter, require('../lib/OptimizerFileWriter'));

MockWriter.create = function() {
    return new MockWriter();
};

module.exports = MockWriter;