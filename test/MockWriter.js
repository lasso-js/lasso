var raptorUtil = require('raptor-util');
var nodePath = require('path');
var fs = require('fs');
var ok = require('assert').ok;
function MockWriter(config) {
    config.outputDir = nodePath.resolve(__dirname, config.outputDir);
    MockWriter.$super.apply(this, arguments);
    this.outputFilesByPath = {};
    this.outputFilesByName = {};
    this.__MockWriter = true;

    var _this = this;

    this.on('resourceWritten', function(resource) {
        var outputFile = resource.outputFile;
        ok(outputFile, 'Output file expected');
        _this._recordOutputFile(outputFile);
    });

    this.on('bundleWritten', function(info) {
        var bundle = info.bundle;
        var outputFile = bundle.outputFile;
        if (outputFile) {
            _this._recordOutputFile(outputFile);
        }
    });
}

MockWriter.prototype = {
    _recordOutputFile: function(outputFile) {
        var code = fs.readFileSync(outputFile, 'utf8');
        this.outputFilesByPath[outputFile] = code;
        this.outputFilesByName[nodePath.basename(outputFile)] = code;
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