var nodePath = require('path');
var fs = require('fs');
var ok = require('assert').ok;

function WriterTracker(writer) {
    var _this = this;
    this.reset();

    writer.on('resourceWritten', function(resource) {
        var outputFile = resource.outputFile;
        ok(outputFile, 'Output file expected');
        _this._recordOutputFile(outputFile);
    });

    writer.on('bundleWritten', function(info) {
        var bundle = info.bundle;
        var outputFile = bundle.outputFile;
        if (outputFile) {
            _this._recordOutputFile(outputFile);
        }
    });
}

WriterTracker.prototype = {
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
		var code = this.outputFilesByName[filename];
        if (code) {
            code = code.replace(/\r\n/g, '\n');
        }
        return code;
    },

    reset: function() {
        this.outputFilesByPath = {};
        this.outputFilesByName = {};
    },

    toString: function() {
        return '[WriterTracker@' + module.filename + ']';
    }
};

WriterTracker.create = function(writer) {
    return new WriterTracker(writer);
};

module.exports = WriterTracker;