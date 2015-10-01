# AMD Compatibility

Lasso.js does not support the AMD module syntax. You can, however, use the [deamdify](https://github.com/jaredhanson/deamdify) Browserify transform if you have third-party AMD code that should be transformed to CommonJS syntax.

## raptor-amd

If you need a lightweight AMD runtime to support external code, you can also include the [raptor-amd](https://github.com/raptorjs/raptor-amd) module on your page. However, that module is no longer maintained and is only kept around for legacy reasons.

## Masking the AMD define function

If you have both an AMD runtime and a CommonJS runtime on the same page then modules wrapped using a UMD wrapper that first checks for `define` (instead of `module.exports`) will attempt to define the module as an AMD module instead of using CommonJS. If you find that this issue is causing problems you can add a special `"mask-define": true` property as shown below:

_browser.json_

```json
{
    "dependencies": [
        {
            "path": "path/to/some-umd-module.js",
            "mask-define": true
        }
    ]
}
```

This will result in code similar to the following:

```javascript
(function(define) { /* mask define */
    // typeof define === 'undefined'
    // ...third-party goes here
}()); // END: mask define wrapper
```