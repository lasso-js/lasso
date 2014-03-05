raptor-optimizer
================
The `raptor-optimizer` module is an extensible server-side tool that can be be used to build optimized web pages by bundling, compiling, transforming and minifying web page dependencies.

# Features
* Optimize Client-side Dependencies
    * Supports all types of dependencies (JavaScript, CSS, images, LESS, CoffeeScript, etc.)
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
    * LESS
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

# Usage

## JavaScript API

### Configuring the Default Page Optimizer
```javascript
var optimizer = require('raptor-optimizer');
optimizer.configure({
    fileWriter: {
        outputDir: 'static',
        urlPrefix: '/static'
    },
    bundles: [
        {
            name: 'bundle1',
            dependencies: [
                'foo.js'
            ]
        },
        {
            name: 'bundle2',
            dependencies: [
                'bar.js'
            ]
        }
    ],
    transforms: [
        'minify-js',
        'minify-css',
        'resolve-css-urls'
    ]
});
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
            'baz.css'
        ]
    },
    function(err, optimizedPage) {
        if (err) {
            console.log('Failed to optimize page: ', err);
            return;
        }
        
        var headHtml = optimizedPage.getHeadHtml();
        /*
        Something similar to the following:
        <link rel="stylesheet" type="text/css" href="/static/my-page-85e3288e.css">
        */
       
        var bodyHtml = optimizedPage.getBodyHtml();
        /*
        Something similar to the following:
        <script type="text/javascript" src="/static/bundle1-6df28666.js"></script>
        <script type="text/javascript" src="/static/bundle2-132d1091.js"></script>
        <script type="text/javascript" src="/static/my-page-1de22b65.js"></script>
        */

        // Inject the generated HTML into the <head> and <body> sections of a page...
    });
```

