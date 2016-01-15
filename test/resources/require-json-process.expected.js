$rmod.def("/require-json-process-data", {
    "hello": "bar process baz"
});
$rmod.def("/require-json-process", function(require, exports, module, __filename, __dirname) { var data = require('./require-json-process-data.json');
});