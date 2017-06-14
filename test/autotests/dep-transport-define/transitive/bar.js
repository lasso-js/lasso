$_mod.def("/foo", function(require, exports, module, __filename, __dirname) { require('/bar'/*'./bar'*/);
});