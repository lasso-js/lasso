$rmod.def("/require-run@1.0.0/foo", function(require, exports, module, __filename, __dirname) { console.log('foo');

});
$rmod.dep("", "require-run", "1.0.0");
$rmod.def("/require-run@1.0.0/init", function(require, exports, module, __filename, __dirname) { require('./foo');

});
$rmod.run("/$/require-run/init",{"wait":false});