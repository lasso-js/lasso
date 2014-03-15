raptor-optimizer
================
The `raptor-optimizer` module is an extensible server-side tool that can be be used to build optimized web pages by bundling, compiling, transforming and minifying web page dependencies.

# Features
* Optimize Client-side Dependencies
    * Supports all types of dependencies (JavaScript, CSS, images, Less, CoffeeScript, etc.)
    * Resource bundling
    * JavaScript minification (based on [uglifyjs](https://github.com/mishoo/UglifyJS))
    * CSS minification (based on [sqwish](https://github.com/ded/sqwish))
    * Checksummed resource URLs
    * CDN urls
    * Base64 image encoding inside CSS files
    * Custom transforms
    * Declarative package dependencies using simple `optimizer.json` files
    * Generates the HTML markup required to include optimized resources
    * etc.
* Browser-side Node.js Module Loader
    * Conflict-free CommonJS module loader for the browser
    * Supports the [package.json `browser` field](https://gist.github.com/defunctzombie/4339901)
    * Full support for [browserify](http://browserify.org/) shims and transforms
* Dependency Compilation
    * Less
    * Raptor Templates
    * Dust
    * etc.
* Extensible
    * Custom dependency compilers
    * Custom code transforms
    * Plugins
* Configurable
    * Configurable resource bundles
    * Enable/disable transforms
    * Development-mode versus production-mode
    * Enable/disable checksums
    * etc.
* Flexible
    * Integrate with build tools
    * Use with Express or any other web development framework
    * JavaScript API and CLI


# Installation
The following command should be used to install the `raptor-optimizer` module into your project:
```bash
npm install raptor-optimizer --save
```

If you would like to use the available command line interface, then you should install the module globally using the following command:
```bash
npm install raptor-optimizer --global
```

# Usage

## Command Line Interface

Simple usage that writes out a JavaScript bundle and a CSS bundle to the `CWD/static/` directory that includes all of the required dependencies
```bash
optimizer jquery.js style.css some-module
```

With additional options:
```bash
optimizer jquery.js style.less require-run:./main.js \
    --name my-page \                         # Give the page bundle files a name
    --out static                             # Output directory
    --url-prefix /static \                   # URL prefix
    --checksum \                             # Include checksums
    --html \                                 # Head and body HTML
    --plugin raptor-optimizer-require \      # Browser-side Node.js-style require
    --plugin raptor-optimizer-less \         # Compile Less files
    --transform raptor-optimizer-minify-js \ # Minify JS
    --transform raptor-optimizer-minify-css  # Minify CSS
```

Alternatively, you can create a JSON configuration file and use that instead (recommended):
```bash
optimizer --config optimizer-config.json
```

The next section describes how to configure the `raptor-optimizer`.

## Configuration

```json
{
    // Plugins with custom dependency compilers, writers, etc.:
    "plugins": { 
        // Each key should be a module name/path and the value 
        // is the plugin config:
        "raptor-optimizer-less": {},
        "./src/optimizer/my-plugin": {}
    }, // See [Available Plugins](#available-plugins) below
    // Configure the default bundle file writer:
    "fileWriter": {
        "outputDir": "static",     // Where to write the bundles
        "urlPrefix": "/static",    // Generate URLs with specified prefix
        "checksumsEnabled": false, // Include checksum in output files?
        "includeSlotNames": false  // Include slot name in output files?
    },
    // Output transforms:
    "transforms": [
        "raptor-optimizer-minify-js",
        "raptor-optimizer-minify-css",
        "raptor-optimizer-resolve-css-urls",
        "./src/optimizer/my-transform.js"
    ], // See [Available Output Transforms](#available-output-transforms) below
    // Pre-configured bundles that apply to all pages:
    "bundles": [
        {
            "name": "bundle1",
            "dependencies": [
                "foo.js"
            ]
        },
        {
            "name": "bundle2",
            "dependencies": [
                "bar.js"
            ]
        }
    ],    
    // Optional set of pre-configured page bundles
    "pages": {
        "index": {
            "dependencies": [
                "require-run: ./src/pages/index/browser-main.js",
                "style.less"
            ]
        },
        "login": {
            "dependencies": [
                "./src/pages/login/optimizer.json"
            ]
        }
    }
}
```

## JavaScript API

### Configuring the Default Page Optimizer
```javascript
var optimizer = require('raptor-optimizer');
optimizer.configure(config);
```

If the value of the `config` argument is a `String` then it is treated as a path to a JSON configuration file.

### Creating a New Page Optimizer
```javascript
var pageOptimizer = optimizer.create(config);
pageOptimizer.optimizePage(...);
```

### Optimizing a Page
To optimize a simple set of JavaScript and CSS dependencies:
```javascript
var optimizer = require('raptor-optimizer');
optimizer.optimizePage({
        name: 'my-page',
        dependencies: [
            'foo.js',
            'bar.js',
            'baz.js',
            'qux.css'
        ]
    },
    function(err, optimizedPage) {
        if (err) {
            console.log('Failed to optimize page: ', err);
            return;
        }
        
        var headHtml = optimizedPage.getHeadHtml();
        /*
        String with a value similar to the following:
        <link rel="stylesheet" type="text/css" href="/static/my-page-85e3288e.css">
        */
       
        var bodyHtml = optimizedPage.getBodyHtml();
        /*
        String with a value similar to the following:
        <script type="text/javascript" src="/static/bundle1-6df28666.js"></script>
        <script type="text/javascript" src="/static/bundle2-132d1091.js"></script>
        <script type="text/javascript" src="/static/my-page-1de22b65.js"></script>
        */

        // Inject the generated HTML into the <head> and <body> sections of a page...
    });
```

# Dependencies

To optimize a page or build pre-configured bundles the `raptor-optimizer` module walks a dependency graph. A dependency can either be a JavaScript or CSS resource (or a file that compiles to either JavaScript or CSS) or a dependency can be a reference to a set of transitive dependencies. Some dependencies are inferred from scanning source code and other dependencies can be made explicit by listing them out in code or in an `optimizer.json` file. 

It's also possible to register your own [custom dependency types](#custom-dependency-types). With custom dependency types, you can control how resources are compiled or a custom dependency type can be used to resolve additional dependencies during optimization.

A dependency can be described using a simple `String` path as shown in the following code:

```json
[
    "style.less",
    "../third-party/jquery.js"
]
```

In the examples, the dependency type is inferred from the filename extension. Alternatively, the dependency type can be made explicit using either one of the following formats:

```json
[
    "less: style.less",
    { "type": "js", "path": "../third-party/jquery.js" }
]
```

You can also create a dependency that references dependencies in a separate `optimizer.json` file. For esxample:
```js
[
    // Relative path:
    "./some-module/optimizer.json", 

    // Look for "my-module/optimizer.json" in "node_modules":
    "my-module/optimizer.json", 
]
```

If the path does not have a file extension then it is assumed to be a path to an `optimizer.json` file so the following short-hand works as well:
```js
[
    "./some-module"
    "my-module", 
]
```

# Available Plugins

Below is a list of available plugins supported by the `raptor-optimizer`:

* [raptor-optimizer-less](https://github.com/raptorjs3/raptor-optimizer-less): Compile [Less](http://lesscss.org/) files to CSS
* [raptor-optimizer-require](https://github.com/raptorjs3/raptor-optimizer-require): Node.js-style require for the browser (similar to [browserify](https://github.com/substack/node-browserify))
* [raptor-optimizer-rhtml](https://github.com/raptorjs3/raptor-optimizer-require): Compile [Raptor Template](https://github.com/raptorjs3/raptor-templates) files to JavaScript

To use any of the above plugins, you must first install it using `npm install`. For example:

```bash
npm install raptor-optimizer-less --save
```

If you create your own `raptor-optimizer` plugin please send a Pull Request and it will show up above. Also, do not forget to tag your plugin with `raptor-optimizer-plugin` and `raptor-optimizer` in your `package.json` so that others can browse for it in [npm](https://www.npmjs.org/)

# Available Output Transforms

Below is a list of available output transforms supported by the `raptor-optimizer`:

* [raptor-optimizer-minify-css](https://github.com/raptorjs3/raptor-optimizer-less): Minify CSS files using [sqwish](https://github.com/ded/sqwish)
* [raptor-optimizer-minify-js](https://github.com/raptorjs3/raptor-optimizer-minify-js): Minify JavaScript files using [uglify-js](https://www.npmjs.org/package/uglify-js)
* [raptor-optimizer-resolve-css-urls](https://github.com/raptorjs3/raptor-optimizer-resolve-css-urls): Replace each resource URL in a CSS file with an optimized resource URL

To use any of the above output transforms, you must first install it using `npm install`. For example:

```bash
npm install raptor-optimizer-minify-js --save
```

If you create your own `raptor-optimizer` transform please send a Pull Request and it will show up above. Also, do not forget to tag your plugin with `raptor-optimizer-transform` and `raptor-optimizer` in your `package.json` so that others can browse for it in [npm](https://www.npmjs.org/)

# Additional Reading

## Custom Dependency Types

## Custom Transforms

## Custom Plugins



