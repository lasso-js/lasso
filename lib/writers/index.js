var writersByName = {};
var Writer = require('./Writer');
var FileWriter = require('./FileWriter');

function getWriter(name) {
    var writer = writersByName[name];
    if (!writer) {
        throw new Error('Writer not found with name "' + name +
            '". Registered writers: [' + Object.keys(writersByName).join(',') + ']');
    }
    return writer;
}

function registerWriter(name, writer) {
    writersByName[name] = writer;
}


registerWriter('file', FileWriter);

exports.get = getWriter;
exports.register = registerWriter;
exports.Writer = Writer;
exports.FileWriter = FileWriter;