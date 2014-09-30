RaptorJS Optimizer
==================

The RaptorJS Optimizer is a Node.js-style module bundler that also provides first-level support for optimally delivering JavaScript, CSS, images and other assets to the browser.

This tool offers many different optimizations such as a bundling, lazy loading, compression and fingerprinted resource URLs. Plugins are provided to support pre-processors and compilers such as Less, Stylus and Marko. This developer-friendly tool does not require that you change the way that you already code and can easily be adopted by existing applications.

![eBay Open Source](https://raw.githubusercontent.com/raptorjs3/optimizer/master/images/ebay.png)


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

# Table of Contents

- [Example](#example)
- [Design Philosophy](#design-philosophy)
- [Features](#features)
- [Another Client-side Bundler?](#another-client-side-bundler)
- [Installation](#installation)
- [Tutorials](#tutorials)
	- [Tutorial: Command Line Interface](#tutorial-command-line-interface)
	- [Tutorial: JSON Configuration File](#tutorial-json-configuration-file)
	- [Tutorial: Asynchronous/Lazy Loading](#tutorial-asynchronouslazy-loading)
	- [Tutorial: JavaScript API](#tutorial-javascript-api)
	- [Tutorial: Optimizer Taglib](#tutorial-optimizer-taglib)
	- [Tutorial: Client/Server Template Rendering](#tutorial-clientserver-template-rendering)
	- [Tutorial: Runtime Optimization with Express](#tutorial-runtime-optimization-with-express)
- [Usage](#usage)
	- [Command Line Interface](#command-line-interface)
	- [Configuration](#configuration)
		- [Default Configuration](#default-configuration)
		- [Complete Configuration](#complete-configuration)
	- [JavaScript API](#javascript-api)
		- [Configuring the Default Page Optimizer](#configuring-the-default-page-optimizer)
		- [Optimizing a Page](#optimizing-a-page)
		- [Creating a New Page Optimizer](#creating-a-new-page-optimizer)
- [Dependencies](#dependencies)
	- [Conditional Dependencies](#conditional-dependencies)
		- [Enabling Extensions](#enabling-extensions)
- [Node.js-style Module Support](#nodejs-style-module-support)
- [Bundling](#bundling)
	- [Bundling Example](#bundling-example)
- [Asynchronous Module Loading](#asynchronous-module-loading)
- [Available Plugins](#available-plugins)
- [Optimizer Taglib](#optimizer-taglib)
	- [Using the Optimizer Taglib with Marko](#using-the-optimizer-taglib-with-marko)
	- [Using the Optimizer Taglib with Dust](#using-the-optimizer-taglib-with-dust)
- [Extending the Optimizer](#extending-the-optimizer)
	- [Custom Plugins](#custom-plugins)
	- [Custom Dependency Types](#custom-dependency-types)
		- [Custom JavaScript Dependency Type](#custom-javascript-dependency-type)
		- [Custom CSS Dependency Type](#custom-css-dependency-type)
		- [Custom Package Type](#custom-package-type)
	- [Custom Output Transforms](#custom-output-transforms)
- [Sample Projects](#sample-projects)
- [Discuss](#discuss)
- [Maintainers](#maintainers)
- [Contributors](#contributors)
- [Contribute](#contribute)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Example

Install some modules from npm:

```
npm install optimizer-cli --global
npm install change-case
```

Create the main Node.js JavaScript module file:

__main.js:__

```javascript
var changeCase = require('change-case');
console.log(changeCase.titleCase('hello world')); // Output: 'Hello World'
```

Create a StyleSheet for the page:

__style.css__

```css
body {
    background-color: #5B83AD;
}
```

Create an HTML page to host the application:

__my-page.html:__

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimizer Demo</title>
</head>
<body>
    <h1 id="header">Optimizer Demo</h1>
</body>
</html>
```

Run the following command:

```bash
optimizer style.css --main main.js --inject-into my-page.html --watch
```

Output:

```
Output for page "my-page":
  Resource bundle files:
    static/my-page-9ac9985e.js
    static/my-page-1ae3e9bf.css
  HTML slots file:
    build/my-page.html.json
  Updated HTML file:
    my-page.html
```

Open up `my-page.html` in your web browser and in the JavaScript console you will see the output of our program running in the browser, as well as a page styled by `style.css`.

As you can see, with the Optimizer you no longer have to struggle with managing complex build scripts. Simply let the Optimizer worry about generating all of the required optimized resource bundles and injecting them into your page so that you can just focus on writing clean and modular code.

There's also a JavaScript API, taglib and a collection of plugins to make your job as a front-end web developer easier. Please read on to learn how you can easily utilize the Optimizer in your application.

# Design Philosophy

* Dependencies should be **declarative** _or_ discovered via **static code analysis**
* Common **module loading** patterns should be supported
* Must be **extensible** to support all types of resources
* **Maximize productivity** in development
* **Maximize performance** in production
* Must be **easy to adopt** and not change how you write your code
* Can be used at **runtime or build time**
* Must be **configurable**

# Features

* Optimize Client-side Dependencies
    * Supports all types of dependencies (JavaScript, CSS, images, Less, CoffeeScript, etc.)
    * Configurable resource bundling
    * JavaScript minification
    * CSS minification
    * [Fingerprinted](http://en.wikipedia.org/wiki/Fingerprint_(computing)) resource URLs
    * Prefix resources with CDN host name
    * Optional Base64 image encoding inside CSS files
    * Custom output transforms
    * Declarative browser-side package dependencies using simple `optimizer.json` files
    * Generates the HTML markup required to include optimized resources
    * etc.
* Browser-side Node.js Module Loader
    * Full support for [Isomorphic JavaScript](http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/)
    * Conflict-free CommonJS module loader for the browser
    * Complete compatibility with Node.js
        * Supports `module.exports`, `exports`, `require`, `require.resolve`, `__dirname`, `__filename`, `process`, etc.
    * Supports the [package.json `browser` field](https://gist.github.com/defunctzombie/4339901)
    * Full support for [browserify](http://browserify.org/) shims and transforms
    * Maintains line numbers in wrapped code
* Developer Friendly
    * Disable bundling and minification in development
    * Line numbers are maintained for Node.js modules source
    * Extremely fast _incremental builds_!
        * Only modified bundles are written to disk
        * Disk caches are utilized to avoid repeating the same work
* Dependency Compilation
    * Less
    * Marko
    * Dust
    * etc.
* Extensible
    * Custom dependency compilers
    * Custom code transforms
    * Custom bundle writers
    * Custom plugins
* Configurable
    * Configurable resource bundles
    * Enable/disable transforms
    * Development-mode versus production-mode
    * Enable/disable fingerprints
    * etc.
* Flexible
    * Integrate with build tools
    * Use with Express or any other web development framework
    * JavaScript API, CLI and taglib
* _Future_
    * Automatic image sprites
    * Automatic image compression

# Another Client-side Bundler?


[Browserify](http://browserify.org/) is an excellent JavaScript module bundler. We are huge supporters of writing Node.js-style modules (i.e. CommonJS), and we also believe [npm](https://www.npmjs.org/) is an excellent package manager. If you are not using a JavaScript module bundler then you are absolutely missing out. Modularity is equally important for client-side code as it is for server-side code, and a JavaScript module bundler should be part of every front-end developer's toolbox.

So why did we create the RaptorJS Optimizer if Browserify is such a great tool? We created the RaptorJS Optimizer because we wanted a top-notch JavaScript module bundler that _also_ provides first-level support for transporting CSS, "plain" JavaScript, images, fonts and other front-end assets to the browser in the most optimal way. In addition, we want to enable developers to easily create web applications that follow [widely accepted rules for creating faster-loading websites](http://stevesouders.com/examples/rules.php) (such as putting StyleSheets at the top, and JavaScript at the bottom). We also want to allow for developers to easily load additional JavaScript and StyleSheets after the initial page load.

While high performance is very important for production systems, we want to also provide a more developer-friendly experience by offering fast, incremental builds, simplifying development and by producing debuggable output code. And, of course, we do not want developers to have to learn how to code their applications in a new way so the RaptorJS Optimizer was built to not change how you already code. You'll even find support for Browserify shims and transforms. Therefore, if you try out the RaptorJS Optimizer and it is not the tool for you, then feel free to switch back to something else (it'll of course be ready if your application's requirements change in the future). eBay and other large companies rely on the RaptorJS Optimizer for delivering high performance websites and are committed to its success. If you try it out and find gaps, please let us know!

# Installation

The following command should be used to install the `optimizer` module into your project:

```bash
npm install optimizer --save
```

If you would like to use the available command line interface, then you should install the [optimizer-cli](https://github.com/raptorjs3/optimizer-cli) module globally using the following command:

```bash
npm install optimizer-cli --global
```

# Tutorials

## Tutorial: Command Line Interface

<hr>

[__Sample App:__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-cli) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-cli](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-cli)

<hr>

Install the command line interface for the Optimizer:

```bash
npm install optimizer-cli --global
```

In an empty directory, initialize a new Node.js project using the following command:

```bash
mkdir my-app
cd my-app
npm init
```

Install required modules into the new project:

```bash
npm install jquery
npm install optimizer-less
```

Create the following files:

__add.js:__

```javascript
module.exports = function(a, b) {
    return a + b;
};
```

__main.js:__

```javascript
var add = require('./add');
var jquery = require('jquery');

jquery(function() {
    $(document.body).append('2+2=' + add(2, 2));
});
```

__style.less:__

```css
@headerColor: #5B83AD;

#header {
    color: @headerColor;
}
```

__my-page.html:__

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimizer Demo</title>
</head>
<body>
    <h1 id="header">Optimizer Demo</h1>
</body>
</html>
```

Finally, run the following command to generate the optimized resource bundles for the page and to also inject the required `<script>` and `<link>` tags into the HTML page:

```bash
optimizer style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins optimizer-less \
    --development
```

If everything worked correctly then you should see output similar to the following:

```text
Output for page "my-page":
  Resource bundle files:
    static/add.js
    static/raptor-modules-meta.js
    static/main.js
    static/node_modules/jquery/dist/jquery.js
    static/raptor-modules-1.0.1/client/lib/raptor-modules-client.js
    static/style.less.css
  HTML slots file:
    build/my-page.html.json
  Updated HTML file:
    my-page.html
```

The updated `my-page.html` file should be similar to the following:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimizer Demo</title>
    <!-- <optimizer-head> -->
    <link rel="stylesheet" type="text/css" href="static/style.less.css">
    <!-- </optimizer-head> -->
</head>
<body>
    <h1 id="header">Optimizer Demo</h1>
    <!-- <optimizer-body> -->
    <script type="text/javascript" src="static/raptor-modules-1.0.1/client/lib/raptor-modules-client.js"></script>
    <script type="text/javascript" src="static/add.js"></script>
    <script type="text/javascript" src="static/raptor-modules-meta.js"></script>
    <script type="text/javascript" src="static/node_modules/jquery/dist/jquery.js"></script>
    <script type="text/javascript" src="static/main.js"></script>
    <script type="text/javascript">$rmod.ready();</script>
    <!-- </optimizer-body> -->
</body>
</html>

```

If you open up `my-page.html` in your web browser you should see a page styled with Less and the output of running `main.js`.

Now try again with `production` mode:

```bash
optimizer style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins optimizer-less \
    --production
```

```
Output for page "my-page":
  Resource bundle files:
    static/my-page-2e3e9936.js
    static/my-page-169ab5d9.css
  HTML slots file:
    build/my-page.html.json
  Updated HTML file:
    my-page.html
```

The updated `my-page.html` file should be similar to the following:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimizer Demo</title>
    <!-- <optimizer-head> -->
    <link rel="stylesheet" type="text/css" href="static/my-page-169ab5d9.css">
    <!-- </optimizer-head> -->
</head>
<body>
    <h1 id="header">Optimizer Demo</h1>
    <!-- <optimizer-body> -->
    <script type="text/javascript" src="static/my-page-2e3e9936.js"></script>
    <script type="text/javascript">$rmod.ready();</script>
    <!-- </optimizer-body> -->
</body>
</html>
```

With the `--production` option enabled, all of the resources are concatenated together, minified and fingerprinted – perfect for high performance web applications running in production.

## Tutorial: JSON Configuration File

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-config) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-config](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-config)

<hr>

The number of command line arguments can get unwieldy so it is better to split out configuration into a separate JSON file. Let's now create a configuration file and configure a few bundles to make things more interesting:

__optimizer-config.json:__

```json
{

    "plugins": [
        "optimizer-less"
    ],
    "fileWriter": {
        "outputDir": "static",
        "fingerprintsEnabled": true
    },
    "minify": true,
    "resolveCssUrls": true,
    "bundlingEnabled": true,
    "bundles": [
        {
            "name": "jquery",
            "dependencies": [
                "require: jquery"
            ]
        },
        {
            "name": "math",
            "dependencies": [
                "require: ./add"
            ]
        }
    ]
}
```

In addition, let's put our page dependencies in their own JSON file:

__my-page.optimizer.json:__

```json
{
    "dependencies": [
        "style.less",
        "require-run: ./main"
    ]
}
```

Now run the page optimizer using the newly created JSON config file and JSON dependencies file:

```bash
optimizer ./my-page.optimizer.json --inject-into my-page.html --config optimizer-config.json
```

Because of the newly configured bundles, we'll see additional JavaScript bundles written to disk as shown below:

```
Output for page "my-page":
  Resource bundle files:
    static/math-169c956d.js
    static/jquery-24db89d9.js
    static/my-page-beed0921.js
    static/my-page-169ab5d9.css
  HTML slots file:
    build/my-page.html.json
  Updated HTML file:
    my-page.html
```

## Tutorial: Asynchronous/Lazy Loading

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-async)To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-async](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-async)

<hr>


Asynchronously (i.e. lazy loading) of additional dependencies is also supported by the Optimizer as shown in the following sample code:

```javascript
var foo = require('foo');
var raptorLoader = require('raptor-loader');
exports.doSomething = function(callback) {
    raptorLoader.async(function(err) {
        if (err) {
            // Handle the case where one or more of the
            // dependencies failed to load.
        }

        // Any modules that are required within the scope
        // of this function will be loaded asynchronously
        var bar = require('bar');
        var baz = require('baz');

        // Do something with bar and baz...

        callback();
    });
}
```

## Tutorial: JavaScript API

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-js-api) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-js-api](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-js-api)

<hr>

For added flexibility there is a JavaScript API that can be used to optimize pages as shown in the following sample code:

```javascript
var optimizer = require('optimizer');
optimizer.configure('optimizer-config.json');
optimizer.optimizePage({
        name: 'my-page'
        dependencies: [
            "style.less",
            "require-run: ./main"
        ]
    },
    function(err, optimizedPage) {
        if (err) {
            // Handle the error
        }

        var headHtml = optimizedPage.getHeadHtml();
        // headHtml will contain something similar to the following:
        // <link rel="stylesheet" type="text/css" href="static/my-page-169ab5d9.css">

        var bodyHtml = optimizedPage.getBodyHtml();
        // bodyHtml will contain something similar to the following:
        //  <script type="text/javascript" src="static/my-page-2e3e9936.js"></script>
    });
```


## Tutorial: Optimizer Taglib

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-taglib) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-taglib](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-taglib)

<hr>

For the ultimate in usability, a taglib is provided for Marko (and Dust) to automatically optimize a page _and_ inject the required HTML markup to include the optimized JavaScript and CSS bundles. Sample Marko template is shown below:

__my-page.marko:__


```html
<!-- Declare the top-level dependencies for the page: -->
<optimizer-page name="my-page" package-path="./my-page.optimizer.json"/>

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimizer Demo</title>

    <!-- <link> tags will be injected below: -->
    <optimizer-head/>
</head>
<body>
    <h1 id="header">Optimizer Demo</h1>

    <!-- <script> tags will be injected below: -->
    <optimizer-body/>
</body>
</html>
```

Using Marko and the Optimizer taglib, you can simply render the page using code similar to the following:

```javascript
var template = require('marko').load('my-page.marko');
template.render({}, function(err, html) {
    // html will include all of the required <link> and <script> tags
});
```

## Tutorial: Client/Server Template Rendering

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-templates) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-templates](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-templates)

<hr>

To demonstrate rendering of the same template on the server and the client we will start with the following Marko template:

__template.marko__

```html
Hello ${data.name}!
```

_NOTE: The sample app for this tutorial includes sample code that illustrates how to also render both a Dust template and a Handlebars template on both the client and server._

We will then create a `main.js` file to render the template to the console:

__main.js:__

```javascript
var template = require('marko')
    .load(require.resolve('./template.marko'));

template.render(
    {
        name: 'Frank'
    },
    function(err, html) {
        console.log('Template output: ' + html);
    });
```

_NOTE: The reason we use `require.resolve('./template.marko')` instead of `require('template.marko')` is that Node.js does not understand how to load `.marko` modules and the use of the `require.extensions` has been [deprecated](http://nodejs.org/api/globals.html#globals_require_extensions). `require.resolve()` is used to get the resolved path for the template and the [marko](https://github.com/raptorjs3/marko) module uses that path to load template into memory._

Running `node main.js` on the server will produce the following output in the console:

```html
Template output: Hello Frank!
```

In order to automatically detect and compile required `*.marko` templates we will need to install the [optimizer-marko](https://github.com/raptorjs3/optimizer-marko) plugin using the following command:

```bash
npm install optimizer-marko
```

We can then optimize the page using the following command:

```bash
optimizer style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins optimizer-marko
```

After opening `my-page.html` in your web browser you should then see the same output written to the browser's JavaScript console.

## Tutorial: Runtime Optimization with Express

<hr>

[__Sample App__](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-express) To try out and experiment with the code for this tutorial, please see the following project:<br>[raptor-samples/optimizer-express](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-express)

<hr>

The Optimizer has a smart caching layer and is fast enough so that it can be used at runtime as part of your server application. The easiest way to use the Optimizer at runtime is to use the taglib and simply render the page template to the response output stream.

The first time the page renders, the page will be optimized and cached and the output of the optimization will be used to produce the final page HTML. After the first page rendering, the only work that will be done by the Optimizer is a simple cache lookup.

By default, the Optimizer writes all optimized resource bundles into the `static/` directory at the root of your application. In addition, by default, all resource URLs will be prefixed with `/static`. If resources are to be served up by the local Express server we will need to register the appropriate middleware as shown in the following sample code:

__server.js__

```javascript
var express = require('express');
var compression = require('compression');
var serveStatic = require('serve-static');

// Load the page template:
var template = require('marko')
    .load(require.resolve('./template.marko')

var app = express();

// Enable gzip compression for all HTTP responses:
app.use(compression());

// Any URL that begins with "/static" will be served up
// out of the "static/" directory:
app.use('/static', serveStatic(__dirname + '/static'));

app.get('/', function(req, res) {
    // Render the page template as normal:
    template.render({
            name: 'Frank'
        },
        res);
});
...

app.listen(8080);
```

# Usage

## Command Line Interface

The `optimizer` module includes a command line interface (CLI) that can be used to generate optimized resource bundles from the command line.

A simple usage that writes out a JavaScript bundle and a CSS bundle to the `static/` directory that includes all of the required dependencies is shown below:

```bash
optimizer foo.js style.less --main main.js --name my-page
```

With additional options:
```bash
optimizer jquery.js style.less \
    --main main.js \                         # Entry JavaScript module for the browser
    --name my-page \                         # Give the page bundle files a name
    --out static                             # Output directory
    --url-prefix http://mycdn/static/ \      # URL prefix
    --fingerprint \                          # Include fingerprints
    --html \                                 # Head and body HTML
    --minify \                               # Minify JavaScript and CSS
    --inject-into my-page.html \             # Inject HTML markup into a static HTML file
    --plugin my-plugin \                     # Enable a custom plugin
    --watch                                  # Watch for file changes and re-optimize automatically
```

For additional help from the command line, you can run the following command:

```bash
optimizer --help
```

Alternatively, you can create a JSON configuration file and use that instead:
```bash
optimizer --config optimizer-config.json
```

For more documentation on the Command Line Interface please see the [optimizer-cli docs](https://github.com/raptorjs3/optimizer-cli).

## Configuration

### Default Configuration
```javascript
{
    "fileWriter": {
        "outputDir": "static",     // Write all bundles into the "static" directory
        "fingerprintsEnabled": true  // Include fingerprint in output files
    }
}
```

### Complete Configuration

```javascript
{
    // Plugins with custom dependency compilers, writers, etc.:
    "plugins": [ // Optimizer plugins (see Available Plugins below)
        // Plugins with default config:
        "optimizer-less",
        "optimizer-marko",
        // Plugin with custom configuration:
        {
            "plugin": "optimizer-my-plugin",
            "config": { ... }
        },
        ...
    ],
    // Configure the default bundle file writer:
    "fileWriter": {
        "outputDir": "static",     // Where to write the bundles
        "urlPrefix": "http://mycdn/static",    // Generate URLs with specified prefix
        "fingerprintsEnabled": true, // Include fingerprint in output files?
        "includeSlotNames": false  // Include slot name in output files?
    },
    "minify": true, // If true then the "optimizer-minify-js" and
                    // "optimizer-minify-css" plugins will be
                    // enabled (defaults to false)
    "resolveCssUrls": true, // If true then the "optimizer-resolve-css-urls" plugin
                            // will be enabled (defaults to true)
    "bundlingEnabled": true, // If true then resources will be bundled (defaults to true)
    // Pre-configured bundles that apply to all pages:
    "bundles": [
        {
            "name": "bundle1",
            "dependencies": [
                "foo.js",
                "baz.js"
            ]
        },
        {
            "name": "bundle2",
            "dependencies": [
                "bar.js"
            ]
        }
    ]
}
```

## JavaScript API

### Configuring the Default Page Optimizer
```javascript
var optimizer = require('optimizer');
optimizer.configure(config);
```

If the value of the `config` argument is a `String` then it is treated as a path to a JSON configuration file.


### Optimizing a Page

The following code illustrates how to optimize a simple set of JavaScript and CSS dependencies using the default configured optimizer:

```javascript
var optimizer = require('optimizer');
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

### Creating a New Page Optimizer

```javascript
var pageOptimizer = optimizer.create(config);
pageOptimizer.optimizePage(...);
```

# Dependencies

To optimize a page the Optimizer walks a dependency graph. A dependency can either be a JavaScript or CSS resource (or a file that compiles to either JavaScript or CSS) or a dependency can be a reference to a set of transitive dependencies. Some dependencies are inferred from scanning source code and other dependencies can be made explicit by listing them out in code or in an `optimizer.json` file.

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

You can also create a dependency that references dependencies in a separate `optimizer.json` file. For example:
```js
[
    // Relative path:
    "./some-module/optimizer.json",

    // Look for "my-module/optimizer.json" in "node_modules":
    "my-module/optimizer.json"
]
```

If the path does not have a file extension then it is assumed to be a path to an `optimizer.json` file so the following short-hand works as well:
```js
[
    "./some-module"
    "my-module"
]
```

## Conditional Dependencies

The Optimizer supports conditional dependencies. Conditional dependencies is a powerful feature that allows for a page to be optimized differently based on certain criteria (e.g. "mobile device" versus "desktop"). For caching reasons, the criteria for conditional dependencies should be based on a set of enabled "extensions". An extension is just an arbitrary name that can be enabled/disabled before optimizing a page. For example, to make a dependency conditional such that is only included for mobile devices you can do the following:

```json
{
    "dependencies": [
        { "path": "hello-mobile.js", "if-extension": "mobile" }
    ]
}
```

If needed, a JavaScript expression can be used to describe a more complex condition as shown in the following sample code:

```json
{
    "dependencies": [
        {
            "path": "hello-mobile.js",
            "if": "extensions.contains('mobile') || extensions.contains('ipad')"
        }
    ]
}
```

### Enabling Extensions

The code below shows how to enable extensions when optimizing a page:

__Using the JavaScript API:__

```javascript
pageOptimizer.optimizePage({
    dependencies: [
        { path: 'hello-mobile.js', 'if-extension': 'mobile' }
    ],
    extensions: ['mobile', 'foo', 'bar']
})
```

__Using the Marko taglib:__

```html
<optimize-page ... extensions="['mobile', 'foo', 'bar']">
    ...
</optimize-page>
```

# Node.js-style Module Support

The Optimizer provides full support for transporting Node.js modules to the browser. If you write your modules in the standard Node.js way (i.e. using `require`, `module.exports` and `exports`) then the module will be able to be loaded on both the server and in the browser.

This functionality is offered by the core [optimizer-require](https://github.com/raptorjs3/optimizer-require) plugin which introduces a new `require` dependency type. For example:
```json
[
    "require: ./path-to-some-module"
]
```

If you want to include a module and have it run when loaded (i.e. self-executing) then you should use the `require-run` dependency type:
```json
[
    "require-run: ./main"
]
```

The `optimizer-require` plugin will automatically scan the source for for any required module to include any additional modules that are required by a particular module (done recursively). For a `require` to automatically be detected it must be in the form `require("<module-name>")` or `require.resolve("<module-name>")`.

The `optimizer-require` plugin will automatically wrap all Node.js modules so that the psuedo globals (i.e. `require`, `module`, `exports`, `__filename` and `__dirname`) are made available to the module source code.

The `optimizer-require` plugin also supports [browserify shims](https://github.com/substack/node-browserify#compatibility) and [browserify transforms](https://github.com/substack/node-browserify/wiki/list-of-transforms).

For more details on how the Node.js modules are supported on the browser, please see the documentation for the [raptor-samples/optimizer-require](https://github.com/raptorjs3/optimizer-require) plugin.

# Bundling

By default, all dependencies required for a page will be bundled into a single JavaScript bundle and a single CSS bundle. However, The Optimizer allows application-level bundles to be configured to allow for consistent bundles across pages and for multiple bundles to be included on a single page. Because the Optimizer also generates the HTML markup to include page bundles, the page itself does not need to be changed if the bundle configuration is changed.

If a page has a dependency that is part of an application-level bundle then the dependency will be included as part of the application-level bundle instead of being aggregated with the page-level bundle.

## Bundling Example


Given the following configured bundles:

```json
{
    ...
    "bundles": [
        {
            "name": "bundle1",
            "dependencies": [
                "foo.js",
                "baz.js"
            ]
        },
        {
            "name": "bundle2",
            "dependencies": [
                "bar.js"
            ]
        }
    ]
}
```


Optimizing a page that does not include any dependencies in application-level bundles:

```bash
optimizer app.js style.css --name my-page -c optimizer-config.json
```

Output:

```
Output for page "my-page":
  Resource bundle files:
    static/my-page.js
    static/my-page.css
  HTML slots file:
    build/my-page.html.json
```


Optimizing a page that includes "foo.js" that is part of "bundle1":
```bash
optimizer app.js foo.js style.css --name my-page -c optimizer-config.json
```

Output:

```
Output for page "my-page":
  Resource bundle files:
    static/my-page.js
    static/bundle1.js
    static/my-page.css
  HTML slots file:
    build/my-page.html.json
```

For reference, the following is the content of `build/my-page.html.json` after running the last command:

```json
{
    "body": "<script type=\"text/javascript\" src=\"static/my-page.js\"></script>\n<script type=\"text/javascript\" src=\"static/bundle1.js\"></script>",
    "head": "<link rel=\"stylesheet\" type=\"text/css\" href=\"static/my-page.css\">"
}
```

For more information on working with bundles. Please see the [bundling docs](docs/bundling.md).

# Asynchronous Module Loading

The Optimizer supports asynchronously loading dependencies using the lightweight [raptor-loader](https://github.com/raptorjs3/raptor-loader/blob/master/lib/raptor-loader.js) module as shown in the following sample code:

```javascript
require('raptor-loader').async(function() {
    // All of the requires nested in this function block will be lazily loaded.
    // When all of the required resources are loaded then the function will be invoked.
    var foo = require('foo');
    var bar = require('bar');
});
```

You can also specify additional explicit dependencies if necessary:

```javascript
require('raptor-loader').async(
    [
        'style.less',
        'some/other/optimizer.json'
    ],
    function() {
        // All of the requires nested in this function block will be lazily loaded.
        // When all of the required resources are loaded then the function will be invoked.
        var foo = require('foo');
        var bar = require('bar');
    });
```

You can also choose to declare async dependencies in an `optimizer.json` file:

```json
{
    "dependencies": [
        ...
    ],
    "async": {
        "my-module/lazy": [
            "require: foo",
            "require: bar",
            "style.less",
            "some/other/optimizer.json"
        ]
    }
}
```

The async dependencies can then be referenced in code:
```javascript
require('raptor-loader').async(
    'my-module/lazy',
    function() {
        var foo = require('foo');
        var bar = require('bar');
    });
```

# Available Plugins

Below is a list of plugins that are currently available:

* Core plugins
    * [optimizer-require](https://github.com/raptorjs3/optimizer-require): Node.js-style require for the browser (similar to [browserify](https://github.com/substack/node-browserify))
    * [optimizer-minify-css](https://github.com/raptorjs3/optimizer-less): Minify CSS files using [sqwish](https://github.com/ded/sqwish)
    * [optimizer-minify-js](https://github.com/raptorjs3/optimizer-minify-js): Minify JavaScript files using [uglify-js](https://www.npmjs.org/package/uglify-js)
    * [optimizer-resolve-css-urls](https://github.com/raptorjs3/optimizer-resolve-css-urls): Replace each resource URL in a CSS file with an optimized resource URL

* Third-party plugins
    * [optimizer-dust](https://github.com/raptorjs3/optimizer-dust): Compile [Dust](https://github.com/linkedin/dustjs) template files to JavaScript
    * [optimizer-handlebars](https://github.com/raptorjs3/optimizer-handlebars): Compile [Handlebars](http://handlebarsjs.com/) template files to JavaScript
	* [optimizer-jsx](https://github.com/raptorjs3/optimizer-jsx): Compile [JSX](http://facebook.github.io/react/docs/jsx-in-depth.html) files to JavaScript
    * [optimizer-less](https://github.com/raptorjs3/optimizer-less): Compile [Less](http://lesscss.org/) files to CSS
    * [optimizer-marko](https://github.com/raptorjs3/optimizer-require): Compile [Raptor template](https://github.com/raptorjs3/marko) files to JavaScript
    * [optimizer-sass](https://github.com/raptorjs3/optimizer-sass): Compile [Sass](https://github.com/sass/node-sass) files to CSS
    * [optimizer-stylus](https://github.com/raptorjs3/optimizer-stylus): Compile [Stylus](http://learnboost.github.io/stylus/) files to CSS

To use a third-party plugin, you must first install it using `npm install`. For example:

```bash
npm install optimizer-less --save
```

If you create your own plugin please send a Pull Request and it will show up above. Also, do not forget to tag your plugin with `optimizer-plugin` and `optimizer` in your `package.json` so that others can browse for it using [npm](https://www.npmjs.org/)

# Optimizer Taglib

If you are using [Marko](https://github.com/raptorjs3/marko) or [Dust](https://github.com/linkedin/dustjs) you can utilize the available taglib for the Optimizer to easily optimize page dependencies and embed them into your page.

## Using the Optimizer Taglib with Marko

1. `npm install optimizer --save`
2. `npm install marko --save`

You can now add the optimizer tags to your page templates. For example:

```html
<optimizer-page name="my-page" package-path="./optimizer.json"/>

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
    <optimizer-head/>
</head>
<body>
    <h1>Test Page</h1>
    <optimizer-body/>
</body>
</html>
```

You will then need to create an `optimizer.json` in the same directory as your page template. For example:

_optimizer.json_:
```json
{
    "dependencies": [
        "jquery.js",
        "foo.js",
        "bar.js",
        "style.less"
    ]
}
```

Now when the page renders you will get something similar to the following:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
    <link rel="stylesheet" type="text/css" href="/static/my-page-85e3288e.css">
</head>
<body>
    <h1>Test Page</h1>
    <script type="text/javascript" src="/static/bundle1-6df28666.js"></script>
    <script type="text/javascript" src="/static/bundle2-132d1091.js"></script>
    <script type="text/javascript" src="/static/my-page-1de22b65.js"></script>
</body>
</html>
```

The optimized result is cached so you can skip the build step!

You can also configure the default page optimizer used by the optimizer tags:

```javascript
require('optimizer').configure({...});
```

## Using the Optimizer Taglib with Dust

You should follow the same steps as above, except you must install the [dustjs-linkedin](https://www.npmjs.org/package/dustjs-linkedin) module and then use `require('optimizer/dust').registerHelpers(dust)` to register the helpers:

Install required dependencies:

1. `npm install optimizer --save`
2. `npm install dustjs-linkedin --save`

Register the Dust helpers during initialization:

```javascript
var dust = require('dustjs-linkedin');
require('optimizer/dust').registerHelpers(dust);
```

Finally, in your Dust templates you can use the new optimizer helpers as shown below:

```html

{@optimizer-page name="my-page" packagePath="./optimizer.json" /}

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
    {@optimizer-head /}
</head>
<body>
    <h1>Test Page</h1>
    {@optimizer-body /}
</body>
</html>
```

# Extending the Optimizer

Only read below if you are building plugins or transforms to further enhance the `optimizer` module.

## Custom Plugins

A plugin can be used to change how the optimizer operates. This includes the following:

* Register a custom dependency to support dependencies that compile to JS or CSS
    * Examples:
        * Register a dependency handler for "less" files to compiles Less to CSS
        * Register a dependency handler for "marko" files to compiles Marko template files to JS
* Register a custom bundle writer
    * Examples:
        * Upload bundles to a resource server that backs a CDN instead of writing them to disk
* Register output transforms
    * Examples:
        * Add an output transform to minify JavaScript code
        * Add an output transform to minify CSS code
        * Add an output transform to remove `console.log` from JS code
        * Add an output transform to resolve image URLs in CSS files
* Configure the optimizer
    * Examples:
        * Allow a plugin to automatically configure the optimizer for production usage

A plugin is simply a Node.js module that exports a function with the following signature:

```javascript
/**
 * A plugin for the Optimizer
 * @param  {optimizer/lib/PageOptimizer} optimizer An instance of a PageOptimizer that can be configured
 * @param  {Object} The plugin configuration provided by the user
 */
module.exports = function(pageOptimizer, config) {
    // Register dependency types:
    pageOptimizer.dependencies.registerJavaScriptType('my-js-type', require('./dependency-my-js-type'));
    pageOptimizer.dependencies.registerStyleSheetType('my-css-type', require('./dependency-my-css-type'));
    pageOptimizer.dependencies.registerPackageType('my-package-type', require('./dependency-my-package-type'));

    // Add an output transform
    pageOptimizer.addTransform(require('./my-transform'));

    // Register a custom Node.js/CommonJS module compiler for a custom filename extension
    // var myModule = require('./hello.test');
    pageOptimizer.dependencies.registerRequireExtension('test', function(path, context, callback) {
        callback(null, "exports.sayHello = function() { console.log('Hello!'); }");
    });
};
```

## Custom Dependency Types

There are three types of dependencies that are supported:

* __JavaScript dependency:__ Produces JavaScript code
* __CSS dependency:__ Produces CSS code
* __Package dependency:__ Produces a package of additional JavaScript and CSS dependencies

Each of these dependencies is described in the next few sections. However, it is recommended to also check out the source code of [available plugins](#available-plugins) listed above (e.g. [optimizer-less](https://github.com/raptorjs3/optimizer-less)).

### Custom JavaScript Dependency Type

If you would like to introduce your own custom dependency types then you will need to have your plugin register a dependency handler. This is illustrated in the following sample code:

```javascript
module.exports = function myPlugin(optimizer, config) {
    optimizer.dependencies.registerJavaScriptType(
        'my-custom-type',
        {
            // Declare which properties can be passed to the dependency type
            properties: {
                'path': 'string'
            },

            // Validation checks and initialization based on properties:
            init: function(context, callback) {
                if (!this.path) {
                    return callback(new Error('"path" is required'));
                }

                // NOTE: resolvePath can be used to resolve a provided relative path to a full path
                this.path = this.resolvePath(this.path);
				callback();
            },

            // Read the resource:
            read: function(context, callback) {
                var path = this.path;

                fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
                    if (err) {
                        return callback(err);
                    }

                    myCompiler.compile(src, callback);
                });

                // NOTE: A stream can also be returned
            },

            // getSourceFile is optional and is only used to determine the last modified time
            // stamp and to give the output file a reasonable name when bundling is disabled
            getSourceFile: function() {
                return this.path;
            }
        });
};
```

Once registered, the above dependency can then be referenced from an `optimizer.json` as shown in the following code:

```json
{
    "dependencies": [
        "my-custom-type: hello.file"
    ]
}
```

If a custom dependency supports more than just a `path` property, additional properties could be provided as shown in the following sample code:

```json
{
    "dependencies": [
        {
            "type": "my-custom-type",
            "path": "hello.file",
            "foo": "bar",
            "hello": true
        }
    ]
}
```


### Custom CSS Dependency Type

If you would like to introduce your own custom dependency types then you will need to have your plugin register a dependency handler as shown in the following sample code:

```javascript
module.exports = function myPlugin(optimizer, config) {
    optimizer.dependencies.registerStyleSheetType(
        'my-custom-type',
        handler);
};
```

The `handler` argument for a CSS dependency has the exact same interface as a handler for a JavaScript dependency (described earlier).

### Custom Package Type

A custom package dependency can be used to dynamically resolve additional dependencies at optimization time. The sample package dependency handler below illustrates how a package dependency can be used to automatically include every file in a directory as a dependency:

```javascript
var fs = require('fs');
var path = require('path');

optimizer.dependencies.registerPackageType('dir', {
    properties: {
        'path': 'string'
    },

    init: function(context, callback) {
		var path = this.path;

        if (!path) {
            callback(new Error('"path" is required'));
        }

        this.path = path = this.resolvePath(path); // Convert the relative path to an absolute path

		fs.stat(path, function(err, stat) {
			if (err) {
				return callback(err);
			}

			if (!stat.isDirectory()) {
				return callback(new Error('Directory expected: ' + path));
			}

			callback();
		});
    },

    getDependencies: function(context, callback) {
        var dir = this.path;

        fs.readdir(dir, function(err, filenames) {
            if (err) {
                return callback(err);
            }

            // Convert the filenames to full paths
            var dependencies = filenames.map(function(filename) {
                return path.join(dir, filename);
            });

            callback(null, dependencies);
        });
    },

    getDir: function() {
        // If the dependencies are associated with a directory then return that directory.
        // Otherwise, return null
        return this.path;
    }
});
```

## Custom Output Transforms

Registered output transforms are used to process bundles as they are written to disk. As an example, an output transform can be used to minify a JavaScript or CSS bundle. Another example is that an output transform may be used to remove `console.log` statements from output JavaScript code. Transforms should be registered by a plugin using the `pageOptimizer.addTransform(transform)` method.

As an example, the following unhelpful transform will convert all JavaScript source code to upper case:

```javascript
module.exports = function (pageOptimizer, pluginConfig) {
    pageOptimizer.addTransform({

        // Only apply to JavaScript code
        contentType: 'js', //  'css' is the other option

        // Give your module a friendly name (helpful for debugging in case something goes wrong in your code)
        name: module.id,

        // If stream is set to false then a String will be provided. Otherwise, a readable stream will be provided
        stream: false,

        // Do the magic:
        transform: function(code, contentType, dependency, bundle) {
            return code.toUpperCase();
        }
    });
};
```

Below is the streaming version of the same transform:

```javascript
var through = require('through');

module.exports = function (pageOptimizer, pluginConfig) {
    pageOptimizer.addTransform({

        // Only apply to JavaScript code
        contentType: 'js', //  'css' is the other option

        // Give your module a friendly name (helpful for debugging in case something goes wrong in your code)
        name: module.id,

        stream: true, // We want the code to be streamed to us

        // Do the magic:
        transform: function(inStream, contentType, dependency, bundle) {
            return inStream.pipe(through(
                function write(data) {
                    this.queue(data.toUpperCase());
                }));
        }
    });
};
```

# Sample Projects

* [raptor-samples/optimizer-cli](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-cli): Sample usage of the command-line interface.
* [raptor-samples/optimizer-config](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-config): Sample app that demonstrates the use of a JSON config file.
* [raptor-samples/optimizer-async](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-async): Sample app that demonstrates asynchronous/lazy dependency loading.
* [raptor-samples/optimizer-js-api](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-js-api): Sample app that demonstrates how to use JavaScript API to optimize a page and inject the resulting head and body markup into a page.
* [raptor-samples/optimizer-taglib](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-taglib): Sample app that demonstrates the use of the optimizer taglib for Marko.
* [raptor-samples/optimizer-templates](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-templates): Sample app that demonstrates the use of rendering the same templates on both the server and the client.
* [raptor-samples/optimizer-express](https://github.com/raptorjs3/raptor-samples/tree/master/optimizer-express): Sample app that demonstrates using the Optimizer at runtime as part of an Express server app.

# Discuss

Please post questions or comments on the [RaptorJS Google Groups Discussion Forum](http://groups.google.com/group/raptorjs).

# Maintainers

* [Patrick Steele-Idem](https://github.com/patrick-steele-idem) (Twitter: [@psteeleidem](http://twitter.com/psteeleidem))
* [Phillip Gates-Idem](https://github.com/philidem/) (Twitter: [@philidem](https://twitter.com/philidem))

# Contributors

* Vinod Kumar (Twitter: [@vinodl](https://twitter.com/vinodl))
	- [gulp-optimizer](https://github.com/raptorjs3/gulp-optimizer)
	- [optimizer-jsx](https://github.com/raptorjs3/optimizer-jsx)

# Contribute

Pull Requests welcome. Please submit Github issues for any feature enhancements, bugs or documentation problems.

# License

Apache License v2.0
