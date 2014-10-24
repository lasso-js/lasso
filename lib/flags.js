var FlagSet = require('./FlagSet');

function isFlagSet(o) {
    return o && o.__FlagSet;
}

function createFlagSet(flags) {
    return new FlagSet(flags);
}

exports.isFlagSet = isFlagSet;
exports.createFlagSet = createFlagSet;