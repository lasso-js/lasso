var Writer = require('./Writer');

function createWriter(writerImpl) {
    return new Writer(writerImpl);
}

exports.Writer = Writer;
exports.fileWriter = require('./file-writer');
exports.createWriter = createWriter;