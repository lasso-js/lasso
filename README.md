raptor-optimizer
================
The `raptor-optimizer` module is an extensible server-side tool that can be be used to build optimized web pages by bundling, compiling and minifying web page dependencies.

# Features
* Supports all types of resources (JavaScript, CSS, images, etc.) 
* CommonJS Support
    * Conflict-free CommonJS module loader for the browser
    * Supports the [package.json `browser` field](https://gist.github.com/defunctzombie/4339901)
    * Full support for [browserify](http://browserify.org/) shims and transforms
* Use at build-time or at run-time
* Resource optimizations
    * JavaScript minification (based on [uglifyjs](https://github.com/mishoo/UglifyJS))
    * CSS minification (based on [sqwish](https://github.com/ded/sqwish))
    * Checksummed resource URLs
    * CDN urls
    * Base64 image encoding inside CSS files
    * Custom transforms
* Resource compilation
    * LESS
    * Raptor Templates
    * Dust
    * etc.
* Extensible
    * Custom resource compilers
    * Custom code transforms
    * Custom dependency resolvers
    * Plugins
* Configurable
    * Configurable resource bundles
    * Enable/disable transforms
    * Development-mode versus production-mode
* Use with Express or any other web development framework
* Declarative package dependencies using simple `optimizer.json` files

```javascript
var a = require('a');
```

* Support for loading CommonJS modules in the browser

Source Code Agnostic
Custom Resource Compilers
Reduces the Number of HTTP Requests
Generates Optimized Bundles
Generates HTML to Include Bundles
Optimized Asynchronous Module Loader
Consistent Bundles Across Pages
All URLs Include Checksums
CDN Support
Utilizes RaptorJS Packaging
Supports In-place Deployment
Easily Configurable
Custom Filters for Minification, etc.
Simple JavaScript API

# Installation
The following command should be used to install the `raptor-optimizer` module into your project:
```bash
npm install raptor-optimizer --save
```


