$rmod.def("/amd-module", function(require, exports, module, __filename, __dirname) { var foo = require('foo');
exports.action = function () {
};
});
$rmod.def("/foo@1.0.0/lib/index", function(require, exports, module, __filename, __dirname) { exports.foo = "1.0.0";
require('baz');
require('require/baz');
});
$rmod.def("/baz@3.0.0/lib/index", function(require, exports, module, __filename, __dirname) { exports.baz = "3.0.0";
});
$rmod.dep("/$/foo", "baz", "3.0.0");
$rmod.main("/baz@3.0.0", "lib/index");
$rmod.def("/require@4.0.0/baz/index", function(require, exports, module, __filename, __dirname) { exports.baz = true;
});
$rmod.dep("", "require", "4.0.0");
$rmod.main("/require@4.0.0/baz", "index");
$rmod.dep("", "foo", "1.0.0");
$rmod.main("/foo@1.0.0", "lib/index");