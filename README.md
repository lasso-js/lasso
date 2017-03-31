Lasso.js
==================

[![Build Status](https://travis-ci.org/lasso-js/lasso.svg?branch=master)](https://travis-ci.org/lasso-js/lasso) [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/lasso-js/lasso?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Lasso.js is an eBay open source Node.js-style JavaScript module bundler that also provides first-level support for optimally delivering JavaScript, CSS, images and other assets to the browser.

This tool offers many different optimizations such as a bundling, code splitting, lazy loading, conditional dependencies, compression and fingerprinted resource URLs. Plugins are provided to support pre-processors and compilers such as Less, Stylus and [Marko](https://github.com/raptorjs/marko). This developer-friendly tool does not require that you change the way that you already code and can easily be adopted by existing applications.

# Example

Install the command line interface for Lasso.js:

```text
npm install lasso-cli --global
```

Install a helper module from npm:

```text
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
    <title>Lasso.js Demo</title>
</head>
<body>
    <h1>Lasso.js Demo</h1>
</body>
</html>
```

Run the following command:

```bash
lasso style.css \
    --main main.js \
    --inject-into my-page.html
```

Output:

```text
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

As you can see, with Lasso.js you no longer have to struggle with managing complex build scripts. Simply let Lasso.js worry about generating all of the required resource bundles and injecting them into your page so that you can just focus on writing clean and modular code.

There's also a JavaScript API, taglib and a collection of plugins to make your job as a front-end web developer easier. Please read on to learn how you can easily utilize Lasso.js in your application.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

# Table of Contents

- [Design Philosophy](#design-philosophy)
- [Features](#features)
- [Another Client-side Bundler?](#another-client-side-bundler)
- [Installation](#installation)
- [Usage](#usage)
	- [Command Line Interface](#command-line-interface)
	- [JSON Configuration File](#json-configuration-file)
	- [Dependencies](#dependencies)
		- [External Dependencies](#external-dependencies)
		- [Dependency Attributes](#dependency-attributes)
		- [Conditional Dependencies](#conditional-dependencies)
		- [Enabling Flags](#enabling-flags)
	- [Asynchronous/Lazy Loading](#asynchronouslazy-loading)
	- [Using the JavaScript API](#using-the-javascript-api)
		- [Configuring the Default Lasso](#configuring-the-default-lasso)
		- [Optimizing a Page](#optimizing-a-page)
		- [Creating a New Lasso](#creating-a-new-lasso)
	- [Lasso.js Taglib](#lassojs-taglib)
		- [Using Lasso.js Taglib with Marko](#using-lassojs-taglib-with-marko)
		- [`<lasso-img>`](#<lasso-img>)
	- [Client/Server Template Rendering](#clientserver-template-rendering)
	- [Runtime Optimization with Express](#runtime-optimization-with-express)
	- [Bundling](#bundling)
	- [Code Splitting](#code-splitting)
- [Configuration](#configuration)
	- [Default Configuration](#default-configuration)
	- [Complete Configuration](#complete-configuration)
- [Node.js-style Module Support](#nodejs-style-module-support)
- [Babel Support](#babel-support)
- [No Conflict Builds](#no-conflict-builds)
- [Content Security Policy Support](#content-security-policy-support)
- [Available Plugins](#available-plugins)
- [Extending Lasso.js](#extending-lassojs)
	- [Custom Plugins](#custom-plugins)
	- [Custom Dependency Types](#custom-dependency-types)
		- [Custom JavaScript Dependency Type](#custom-javascript-dependency-type)
		- [Custom CSS Dependency Type](#custom-css-dependency-type)
		- [Custom Package Type](#custom-package-type)
	- [Custom Output Transforms](#custom-output-transforms)
- [JavaScript API](#javascript-api)
- [AMD Compatibility](#amd-compatibility)
- [Sample Projects](#sample-projects)
- [Discuss](#discuss)
- [Maintainers](#maintainers)
- [Contributors](#contributors)
- [Contribute](#contribute)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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

* Bundle Client-side Dependencies
    * Supports all types of front-end resources (JavaScript, CSS, images, Less, CoffeeScript, etc.)
    * Asynchronous/lazy loading of JS/CSS
    * Configurable resource bundling
    * Code splitting
    * JavaScript minification
    * CSS minification
    * [Fingerprinted](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) resource URLs
    * Prefix resources with CDN host name
    * Optional Base64 image encoding inside CSS files
    * Custom output transforms
    * Declarative browser-side package dependencies using simple `browser.json` files
	* endencies
	* Image minification
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
    * Generates the HTML markup required to include bundled resources
    * Disable bundling and minification in development
    * Line numbers are maintained for Node.js modules source
    * Extremely fast _incremental builds_!
        * Only modified bundles are written to disk
        * Disk caches are utilized to avoid repeating the same work
* Dependency Compilation
    * Less
    * [Marko](https://github.com/marko-js/marko)
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
* Security
    * Supports the [nonce attribute](https://www.w3.org/TR/CSP2/#script-src-the-nonce-attribute) when using Content Security Policy for extra security.
* _Future_
    * Automatic image sprites

# Another Client-side Bundler?

[Browserify](http://browserify.org/) is an excellent JavaScript module bundler. We are huge supporters of writing Node.js-style modules (i.e. CommonJS), and we also believe [npm](https://www.npmjs.org/) is an excellent package manager. If you are not using a JavaScript module bundler then you are absolutely missing out. Modularity is equally important for client-side code as it is for server-side code, and a JavaScript module bundler should be part of every front-end developer's toolbox.

So why did we create Lasso.js if Browserify is such a great tool? We created Lasso.js because we wanted a top-notch JavaScript module bundler that _also_ provides first-level support for transporting CSS, "plain" JavaScript, images, fonts and other front-end assets to the browser in the most optimal way. In addition, we want to enable developers to easily create web applications that follow [widely accepted rules for creating faster-loading websites](http://stevesouders.com/examples/rules.php) (such as putting StyleSheets at the top, and JavaScript at the bottom). We also want to allow for developers to easily load additional JavaScript and StyleSheets after the initial page load.

While high performance is very important for production systems, we want to also provide a more developer-friendly experience by offering fast, incremental builds, simplifying development and by producing debuggable output code. And, of course, we do not want developers to have to learn how to code their applications in a new way so Lasso.js was built to not change how you already code. You'll even find support for Browserify shims and transforms. Therefore, if you try out Lasso.js and it is not the tool for you, then feel free to switch back to something else (it'll of course be ready if your application's requirements change in the future). eBay and other large companies rely on Lasso.js for delivering high performance websites and are committed to its success. If you try it out and find gaps, please let us know!

# Installation

The following command should be used to install the `lasso` module into your project:

```bash
npm install lasso --save
```

If you would like to use the available command line interface, then you should install the [lasso-cli](https://github.com/lasso-js/lasso-cli) module globally using the following command:

```bash
npm install lasso-cli --global
```

# Usage

## Command Line Interface

<hr>

[__Sample App:__](https://github.com/lasso-js-samples/lasso-cli) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-cli](https://github.com/lasso-js-samples/lasso-cli)

<hr>

Install the command line interface for Lasso.js:

```bash
npm install lasso-cli --global
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
npm install lasso-less
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

h1 {
    color: @headerColor;
}
```

__my-page.html:__

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Lasso.js Demo</title>
</head>
<body>
    <h1>Lasso.js Demo</h1>
</body>
</html>
```

Finally, run the following command to generate the resource bundles for the page and to also inject the required `<script>` and `<link>` tags into the HTML page:

```bash
lasso style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins lasso-less \
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
    <title>Lasso.js Demo</title>
    <!-- <lasso-head> -->
    <link rel="stylesheet" href="static/style.less.css">
    <!-- </lasso-head> -->
</head>
<body>
    <h1>Lasso.js Demo</h1>
    <!-- <lasso-body> -->
    <script src="static/raptor-modules-1.0.1/client/lib/raptor-modules-client.js"></script>
    <script src="static/add.js"></script>
    <script src="static/raptor-modules-meta.js"></script>
    <script src="static/node_modules/jquery/dist/jquery.js"></script>
    <script src="static/main.js"></script>
    <script>$rmod.ready();</script>
    <!-- </lasso-body> -->
</body>
</html>
```

If you open up `my-page.html` in your web browser you should see a page styled with Less and the output of running `main.js`.

Now try again with `production` mode:

```bash
lasso style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins lasso-less \
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
    <title>Lasso.js Demo</title>
    <!-- <lasso-head> -->
    <link rel="stylesheet" href="static/my-page-169ab5d9.css">
    <!-- </lasso-head> -->
</head>
<body>
    <h1>Lasso.js Demo</h1>
    <!-- <lasso-body> -->
    <script src="static/my-page-2e3e9936.js"></script>
    <script>$rmod.ready();</script>
    <!-- </lasso-body> -->
</body>
</html>
```

With the `--production` option enabled, all of the resources are concatenated together, minified and fingerprinted – perfect for high performance web applications running in production.

For more documentation on the Command Line Interface please see the [lasso-cli docs](https://github.com/lasso-js/lasso-cli).

## JSON Configuration File

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-config) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-config](https://github.com/lasso-js-samples/lasso-config)

<hr>

The number of command line arguments can get unwieldy so it is better to split out configuration into a separate JSON file. Let's now create a configuration file and configure a few bundles to make things more interesting:

__lasso-config.json:__

```json
{

    "plugins": [
        "lasso-less"
    ],
    "outputDir": "static",
	"fingerprintsEnabled": true,
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

__my-page.browser.json:__

```json
{
    "dependencies": [
        "./style.less",
        "require-run: ./main"
    ]
}
```

Now run the page lasso using the newly created JSON config file and JSON dependencies file:

```bash
lasso ./my-page.browser.json \
    --inject-into my-page.html \
    --config lasso-config.json
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

## Dependencies

Lasso.js walks a dependency graph to find all of the resources that need to be bundled. A dependency can either be a JavaScript or CSS resource (or a file that compiles to either JavaScript or CSS) or a dependency can be a reference to a set of transitive dependencies. Some dependencies are inferred from scanning source code and other dependencies can be made explicit by listing them out in the code of JavaScript modules or in separate `browser.json` files.

It's also possible to register your own [custom dependency types](#custom-dependency-types). With custom dependency types, you can control how resources are compiled or a custom dependency type can be used to resolve additional dependencies during optimization.

Browser dependencies can be described as shown in the following sample `browser.json` file:

```json
{
	"dependencies": [
	    "./style.less",
	    "../third-party/jquery.js",
	    "**/*.css",
	    { "type": "js", "url": "https://code.jquery.com/jquery-2.1.4.min.js" },
	    { "type": "css", "url": "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" }
	]
}
```

Alternatively, dependencies can be "required" inside a JavaScript module as shown in the following sample JavaScript code:

```javascript
require('./style.less');

// ...
```

The only caveat to using a `require()` call to add a non-JavaScript module dependency is that by default Node.js will try to load the required file as a JavaScript module if the code runs on the server. To prevent Node.js from trying to load a Less file or other non-JavaScript files as JavaScript modules you can add the following code to your main script:

```javascript
require('lasso/node-require-no-op').enable('.less', '.css');
```


For simple paths, the dependency type is inferred from the filename extension. Alternatively, the dependency type can be made explicit using either one of the following formats:

```json
[
    "./style.less",
    "less: ./style.less",
    { "type": "less", "path": "./style.less" }
]
```

_NOTE: all of the above are equivalent_

You can also create a dependency that references dependencies in a separate `browser.json` file. Dependencies that have the `browser.json` extension are automatically resolved using the require resolver if they are not relative paths. For example:
```js
[
    // Relative path:
    "./some-module/browser.json",

    // Look for "my-module/browser.json" in "node_modules":
    "my-module/browser.json"
]
```

If the path does not have a file extension then it is assumed to be a path to an `browser.json` file so the following short-hand works as well:
```js
[
    "./some-module"
    "my-module"
]
```
If you use the short-hand notation for `browser.json` dependencies, the paths will still be resolved using the require resolver as long as they are not relative paths.

### External Dependencies

Lasso.js does allow referencing external JS/CSS files in your `browser.json` files as shown below:

```json
{
	"dependencies": [
	    { "type": "js", "url": "https://code.jquery.com/jquery-2.1.4.min.js" },
	    { "type": "css", "url": "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" }
	]
}
```

By default, Lasso.js will not bundle external resources with your application's JavaScript and CSS bundles. If you would prefer for an external resource to be downloaded from the remote server and bundled with your other application code during the lassoing then you can set the `external` property to `false` as shown below (`external` defaults to `true`):

```json
{
	"dependencies": [
	    { "type": "js", "url": "https://code.jquery.com/jquery-2.1.4.min.js", "external": false }
	]
}
```

Setting `external` to `false` in the above example will result in jQuery being downloaded from the CDN and bundled with all of the other JS code for the app. That is, the code for jQuery will not be served up by the jQuery CDN.

### Dependency Attributes

Adding an `attributes` object to a dependency definition will result in those attributes being defined on the html tag for that dependency.  For bundled dependencies, these attributes will be merged with latter dependencies taking priority.

The following is an example using the `integrity` and `crossorigin` attributes for [Subresource Integrity (SRI) checking](https://www.w3.org/TR/SRI/). This allows browsers to ensure that resources hosted on third-party servers have not been tampered with. Use of SRI is recommended as a best-practice, whenever libraries are loaded from a third-party source.

```json
{
	"dependencies": [
	    {
        "type": "js",
        "url": "https://code.jquery.com/jquery-3.1.1.min.js",
        "attributes":{
          "integrity":"sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8=",
          "crossorigin":"anonymous"
        }
      }
	]
}
```

**Generated Output:**
```html
<script
  src="https://code.jquery.com/jquery-3.1.1.min.js"
  integrity="sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8="
  crossorigin="anonymous"></script>
```

### Conditional Dependencies

Lasso.js supports conditional dependencies. Conditional dependencies is a powerful feature that allows for a page to be built differently based on certain flags (e.g. "mobile device" versus "desktop"). For caching reasons, the flags for conditional dependencies should be based on a set of enabled flag. A flag is just an arbitrary name that can be enabled/disabled before optimizing a page. For example, to make a dependency conditional such that is only included for mobile devices you can do the following:

```json
{
    "dependencies": [
        { "path": "./hello-mobile.js", "if-flag": "mobile" }
    ]
}
```

Alternatively, you can also include the desktop version of a file if the "mobile" extension is not enabled using `if-not-flag`.
```json
{
    "dependencies": [
        { "path": "./hello-desktop.js", "if-not-flag": "mobile" }
    ]
}
```

If needed, a JavaScript expression can be used to describe a more complex condition as shown in the following sample code:

```json
{
    "dependencies": [
        {
            "path": "./hello-mobile.js",
            "if": "flags.contains('phone') || flags.contains('tablet')"
        }
    ]
}
```

Finally, if you prefer, you can group your conditional dependencies if needed:

```json
{
    "dependencies": [
        {
            "if-flag": "mobile",
            "dependencies": [
                "./style-mobile.css",
                "./client-mobile.js"
            ]
        }
    ]
}
```

### Enabling Flags

The code below shows how to enable flags when optimizing a page:

__Using the JavaScript API:__

```javascript
myLasso.lassoPage({
    dependencies: [
        { path: './hello-mobile.js', 'if-flag': 'mobile' }
    ],
    flags: ['mobile', 'foo', 'bar']
})
```

__Using the Marko taglib:__

```html
<lasso-page ... flags="['mobile', 'foo', 'bar']">
    ...
</lasso-page>
```

## Asynchronous/Lazy Loading

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-async)To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-async](https://github.com/lasso-js-samples/lasso-async)

<hr>


Lasso.js supports asynchronously loading dependencies using the lightweight [lasso-loader](https://github.com/lasso-js/lasso-loader) module as shown in the following sample code:

```javascript
var lassoLoader = require('lasso-loader');

lassoLoader.async(function(err) {
    // Any modules that are required within the scope
    // of this function will be loaded asynchronously*.
    // Lasso.js ensures that modules are only
    // loaded once from the server.
    //
    // *Modules that were included as part of the initial
    // page load will automatically be de-duped.

    if (err) {
        // Handle the case where one or more of the
        // dependencies failed to load.
    }

    var add = require('./add');
    var jquery = require('jquery');

    jquery(function() {
        $(document.body).append('2+2=' + add(2, 2));
    });
});
```

During optimization, Lasso.js detects the call to `require('lasso-loader').async(...)` and transforms the code such that the function is not invoked until all of the required modules referenced in the body of callback function are completely loaded.

You can also specify additional explicit dependencies if necessary:

```javascript
require('lasso-loader').async(
    [
        './style.less',
        'some/other/browser.json'
    ],
    function() {
        // All of the requires nested in this function block will be lazily loaded.
        // When all of the required resources are loaded then the function will be invoked.
        var foo = require('foo');
        var bar = require('bar');
    });
```

You can also choose to declare async dependencies in an `browser.json` file:

```json
{
    "dependencies": [
        ...
    ],
    "async": {
        "my-module/lazy": [
            "require: foo",
            "require: bar",
            "./style.less",
            "some/other/browser.json"
        ]
    }
}
```

The async dependencies can then be referenced in code:
```javascript
require('lasso-loader').async(
    'my-module/lazy',
    function() {
        var foo = require('foo');
        var bar = require('bar');
    });
```

## Using the JavaScript API

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-js-api) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-js-api](https://github.com/lasso-js-samples/lasso-js-api)

<hr>

For added flexibility there is a JavaScript API that can be used to lasso pages as shown in the following sample code:

```javascript
var lasso = require('lasso');
lasso.configure('lasso-config.json');
lasso.lassoPage({
        name: 'my-page',
        dependencies: [
            "./style.less",
            "require-run: ./main"
        ]
    },
    function(err, lassoPageResult) {
        if (err) {
            // Handle the error
        }

        var headHtml = lassoPageResult.getHeadHtml();
        // headHtml will contain something similar to the following:
        // <link rel="stylesheet" href="static/my-page-169ab5d9.css">

        var bodyHtml = lassoPageResult.getBodyHtml();
        // bodyHtml will contain something similar to the following:
        //  <script src="static/my-page-2e3e9936.js"></script>
    });
```

The `lassoPage(options)` method supports the following options:

- `data` (`Object`) - Arbitrary data that can be made available to plugins via `lassoContext.data`.
- `cacheKey` (`String`) - A unique String to use for cache reads and writes. Defaults to `name`.
- `dependencies` (`Array`) - An array of top-level page dependencies (e.g. `['foo.js', 'foo.css', 'require: jquery']`).
- `flags` (`Array`) - The set of enabled flags (e.g. `['mobile', 'touch']`).
- `from` (`String`) - The base path for resolving relative paths for top-level dependencies.
- `name` (`String`) - The page name. Used for determining the names of the output JS/CSS bundles.
- `packagePath` (`String`) - The path to an `browser.json` file that describes the top-level dependencies.

### Configuring the Default Lasso
```javascript
var lasso = require('lasso');
lasso.configure(config);
```

If the value of the `config` argument is a `String` then it is treated as a path to a JSON configuration file.


### Optimizing a Page

The following code illustrates how to lasso a simple set of JavaScript and CSS dependencies using the default configured lasso:

```javascript
var lasso = require('lasso');
lasso.lassoPage({
        name: 'my-page',
        dependencies: [
            './foo.js',
            './bar.js',
            './baz.js',
            './qux.css'
        ]
    },
    function(err, lassoPageResult) {
        if (err) {
            console.log('Failed to lasso page: ', err);
            return;
        }

        var headHtml = lassoPageResult.getHeadHtml();
        /*
        String with a value similar to the following:
        <link rel="stylesheet" href="/static/my-page-85e3288e.css">
        */

        var bodyHtml = lassoPageResult.getBodyHtml();
        /*
        String with a value similar to the following:
        <script src="/static/bundle1-6df28666.js"></script>
        <script src="/static/bundle2-132d1091.js"></script>
        <script src="/static/my-page-1de22b65.js"></script>
        */

        // Inject the generated HTML into the <head> and <body> sections of a page...
    });
```

### Creating a New Lasso

```javascript
var myLasso = lasso.create(config);
myLasso.lassoPage(...);
```


## Lasso.js Taglib

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-taglib) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-taglib](https://github.com/lasso-js-samples/lasso-taglib)

<hr>

For the ultimate in usability, a taglib is provided for Marko (and Dust) to automatically lasso a page _and_ inject the required HTML markup to include the JavaScript and CSS bundles.

If you are using [Marko](https://github.com/marko-js/marko) you can utilize the available taglib for Lasso.js to easily lasso page dependencies and embed them into your page.

### Using Lasso.js Taglib with Marko

1. `npm install lasso --save`
2. `npm install marko --save`

You can now add the lasso tags to your page templates. For example:

```html
<lasso-page package-path="./browser.json"/>

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
    <lasso-head/>
</head>
<body>
    <h1>Test Page</h1>
    <lasso-body/>
</body>
</html>
```

You will then need to create an `browser.json` in the same directory as your page template. For example:

_browser.json_:
```json
{
    "dependencies": [
        "./jquery.js",
        "./foo.js",
        "./bar.js",
        "./style.less"
    ]
}
```

Using Marko and Lasso.js taglib, you can simply render the page using code similar to the following:

```javascript
var template = require('marko').load('my-page.marko');
template.render({}, function(err, html) {
    // html will include all of the required <link> and <script> tags
});
```

The output of the page rendering will be similar to the following:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
    <link rel="stylesheet" href="/static/my-page-85e3288e.css">
</head>
<body>
    <h1>Test Page</h1>
    <script src="/static/bundle1-6df28666.js"></script>
    <script src="/static/bundle2-132d1091.js"></script>
    <script src="/static/my-page-1de22b65.js"></script>
</body>
</html>
```

The lasso result is cached so you can skip the build step!

You can also configure the default page lasso used by the lasso tags:

```javascript
require('lasso').configure({...});
```

For more details, please see following documentation: [Lasso.js Taglib for Marko](taglib-marko.md)

<a name="<lasso-img"></a>

### `<lasso-img>`

The `<lasso-img>` tag can be used to render `<img>` tags while also having the image referenced by the `src` attribute automatically go through the Lasso.js asset pipeline. In addition, if the `width` and `height` attributes are not specified then those attributes will automatically be added. This tag can be rendered on both the server and in the browser.

Example:

```xml
<lasso-img src="./foo.jpg"/>
```

This might produce the following HTML output depending on how Lasso.js is configured:

```html
<img src="/static/foo-25b047cc.jpg" width="100" height="100">
```

## Client/Server Template Rendering

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-templates) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-templates](https://github.com/lasso-js-samples/lasso-templates)

<hr>

To demonstrate rendering of the same template on the server and the client we will start with the following Marko template:

__template.marko__

```html
Hello ${data.name}!
```

_NOTE: The sample app includes sample code that illustrates how to also render both a Dust template and a Handlebars template on both the client and server._

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

_NOTE: The reason we use `require.resolve('./template.marko')` instead of `require('template.marko')` is that Node.js does not understand how to load `.marko` modules and the use of the `require.extensions` has been [deprecated](http://nodejs.org/api/globals.html#globals_require_extensions). `require.resolve()` is used to get the resolved path for the template and the [marko](https://github.com/marko-js/marko) module uses that path to load template into memory._

Running `node main.js` on the server will produce the following output in the console:

```html
Template output: Hello Frank!
```

In order to automatically detect and compile required `*.marko` templates we will need to install the [lasso-marko](https://github.com/lasso-js/lasso-marko) plugin using the following command:

```bash
npm install lasso-marko
```

We can then lasso the page using the following command:

```bash
lasso style.less \
    --main main.js \
    --inject-into my-page.html \
    --plugins lasso-marko
```

After opening `my-page.html` in your web browser you should then see the same output written to the browser's JavaScript console.

## Middleware for Express and Koa

Lasso includes optional middleware for both Express and Koa that can be used to serve up the static files that it generates.

### `serveStatic(options)``

The [`serveStatic` middleware]() provided by Lasso is a small wrapper around the [send](https://github.com/pillarjs/send) package.

Supported options:

- __lasso__ - The configured lasso instance (defaults to `require('lasso').getDefaultLasso()`)
- __sendOptions__ - Pass through options for the `send` module. See [send » options](https://github.com/pillarjs/send#optionsd)

### Using `serveStatic` with Express

```javascript
app.use(require('lasso/middleware').serveStatic(options));
```

### Using `serveStatic` with Koa

```javascript
app.use(require('lasso/middleware/koa').serveStatic(options));
```

## Runtime Optimization with Express and Koa

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-express) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-express](https://github.com/lasso-js-samples/lasso-express)

<hr>

Lasso.js has a smart caching layer and is fast enough so that it can be used at runtime as part of your server application. The easiest way to use Lasso.js at runtime is to use the Marko taglib and simply render the page template to the response output stream.

The first time the page renders, the page will be lassoed and cached and the output of the lasso will be used to produce the final page HTML. After the first page rendering, the only work that will be done by Lasso.js is a simple cache lookup.

By default, Lasso.js writes all resource bundles into the `static/` directory at the root of your application. In addition, by default, all resource URLs will be prefixed with `/static`. If resources are to be served up by the local Express server we will need to register the appropriate middleware as shown in the following sample code:

__server.js__

```javascript
require('marko/node-require');
require('marko/express');

var express = require('express');
var compression = require('compression');
var serveStatic = require('serve-static');

// Load the page template:
var template = require('./template.marko');

// Configure the default lasso
require('lasso').configure({

});

var app = express();

// Enable gzip compression for all HTTP responses:
app.use(compression());

// Any URL that begins with "/static" will be served up
// out of the "static/" directory:
app.use(require('lasso/middleware').serveStatic());

app.get('/', function(req, res) {
    // Render the page template as normal:
    res.marko(template, {
            name: 'Frank'
        });
});
...

app.listen(8080);
```

## Bundling

By default, all dependencies required for a page will be bundled into a single JavaScript bundle and a single CSS bundle. However, Lasso.js allows application-level bundles to be configured to allow for consistent bundles across pages and for multiple bundles to be included on a single page. Because Lasso.js also generates the HTML markup to include page bundles, the page itself does not need to be changed if the bundle configuration is changed.

If a page has a dependency that is part of an application-level bundle then the dependency will be included as part of the application-level bundle instead of being aggregated with the page-level bundle.

Bundles can be configured using the `"bundles"` configuration property that accepts an array of bundle configurations. Each bundle should consist of a name and a set of dependencies to assign to that bundle.

__Bundling Example:__

Given the following configured bundles:

```json
{
    ...
    "bundles": [
        {
            "name": "bundle1",
            "dependencies": [
                "./foo.js",
                "./baz.js"
            ]
        },
        {
            "name": "bundle2",
            "dependencies": [
                "./bar.js"
            ]
        }
    ]
}
```


Optimizing a page that does not include any dependencies in application-level bundles:

```bash
lasso app.js style.css --name my-page -c lasso-config.json
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
lasso app.js foo.js style.css --name my-page -c lasso-config.json
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

For more information on working with bundles. Please see the [bundling docs](docs/bundling.md).

## Code Splitting

<hr>

[__Sample App__](https://github.com/lasso-js-samples/lasso-code-splitting) To try out and experiment with the code, please see the following project:<br>[lasso-js-samples/lasso-code-splitting](https://github.com/lasso-js-samples/lasso-code-splitting)

<hr>

Lasso.js supports splitting out code that multiple pages/entry points have in common into separate bundles. This is accomplished by assigning an `intersection` dependency to a bundle. The `intersection` dependency is a package dependency that produces a set of dependencies that is the intersection of one or more packages. Code splitting ensures that the same code is not downloaded twice by the user when navigating a web application.

The following bundle configuration illustrates how to split out common code into a separate bundle:

```json
{
    "bundles": [
        {
            "name": "common",
            "dependencies": [
                {
                    "intersection": [
                        "./src/pages/home/browser.json",
                        "./src/pages/profile/browser.json"
                    ]
                }
            ]
        }
    ]
}
```
A less strict intersection condition is also supported via a `threshold` property.

For example, to find those dependencies that are among *at least two* of the widgets:
```json
{
    "bundles": [
        {
            "name": "common",
            "dependencies": [
                {
                    "threshold": 2,
                    "intersection": [
                        "require: ./a/widget",
                        "require: ./b/widget",
                        "require: ./c/widget"
                    ]
                }
            ]
        }
    ]
}
```

This could also be expressed as a percentage:
```json
{
    "bundles": [
        {
            "name": "common",
            "dependencies": [
                {
                    "threshold": "66%",
                    "intersection": [
                        "require: ./a/widget",
                        "require: ./b/widget",
                        "require: ./c/widget"
                    ]
                }
            ]
        }
    ]
}
```

# Configuration

## Default Configuration
```javascript
{
    // Write all bundles into the "static" directory
	"outputDir": "static",

	// URL prefix for all bundles
	"urlPrefix": "/static",

	// Include fingerprint in output files
	"fingerprintsEnabled": true
}
```

## Complete Configuration

```javascript
{
    // Configure Lasso.js plugins
    "plugins": [
        // Plugin with a default config:
        "lasso-less",
        // Plugin with custom configuration:
        {
            "plugin": "lasso-my-plugin",
            "config": { ... }
        },
        ...
    ],
    // The base output directory for generated bundles
	"outputDir": "static",

	// Optional URL prefix to prepend to relative bundle paths
	"urlPrefix": "http://mycdn/static",

	// If fingerprints are enabled then a shasum will be included in the URL.
	// This feature is used for cache busting.
	"fingerprintsEnabled": true,

	// If fingerprints are not enabled then the same output file would be
	// used for bundles that go into the head and bundles that go in the
	// body. Enabling this option will ensure that bundles have unique names
	// even if fingerprints are disabled.
	"includeSlotNames": false

    // If "minify" is set to true then output CSS and JavaScript will run
    // through a minification transform. (defaults to false)
    "minify": false,

    "minifyJS": false, // Minify JavaScript

    "minifyCSS": false, // Minify CSS

    "minifyInlineOnly": false, // Only minify inline resources

    "minifyInlineJSOnly": false, // Only minify inline JavaScript resources

    "minifyInlineCSSOnly": false, // Only minify inline CSS resources

    // If "resolveCssUrls" is set to true then URLs found in CSS files will be
    // resolved and the original URLs will be replaced with the resolved URLs.
    // (defaults to true)
    "resolveCssUrls": true,

    // If "relativeUrlsEnabled" is set to false then URLs found in CSS files will
    // be absolute based on the urlPrefix. This default is false, which creates
    // relative URLs in CSS files.
    "relativeUrlsEnabled": true,

    // If "bundlingEnabled" is set to true then dependencies will be concatenated
    // together into one or more bundles. If set to false then each dependency
    // will be written to a separate file. (defaults to true)
    "bundlingEnabled": true,

    // If you want consistent bundles across pages then those shared bundles
    // can be specified below. If a page dependency is part of a shared
    // bundle then the shared bundle will be added to the page (instead of
    // adding the dependency to the page bundle).
    "bundles": [
        {
            // Name of the bundle (used for determining the output filename)
            "name": "bundle1",

            // Set of dependencies to add to the bundle
            "dependencies": [
                "./foo.js",
                "./baz.js"
            ]
        },
        {
            "name": "bundle2",
            "dependencies": [
                "./style/*.css",
                "require: **/*.js"
            ]
        }
    ],

    // The default name of the modules runtime variable is
    // ""$rmod" but you can change that with the noConflict option.
    // This is necessary if you have a webpage that loads
    // multiple JavaScript bundles that were
    // built at different times with Lasso.
    // The string you provide will be used to create
    // a unique name for the modules runtime variable name by
    // removing or replacing illegal characters.
    "noConflict": "myapp"
}
```

# Node.js-style Module Support

Lasso.js provides full support for transporting Node.js modules to the browser. If you write your modules in the standard Node.js way (i.e. using `require`, `module.exports` and `exports`) then the module will be able to be loaded on both the server and in the browser.

This functionality is offered by the core [lasso-require](https://github.com/lasso-js/lasso-require) plugin which introduces a new `require` dependency type. For example:

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

Examples of conditional requires:

```json
[
    {
        "require-run": "./foo",
        "if-flag": "bar"
    },
    {
        "require": "./foo",
        "if-flag": "bar"
    }
]
```

It's also possible to remap a require based on a flag:

```json
{
    "dependencies": [
        ...
    ],
    "requireRemap": [
        {
            "from": "./foo.js",
            "to": "./foo-mobile.js",
            "if-flag": "mobile"
        }
    ]
}
```

The [lasso-require](https://github.com/lasso-js/lasso-require) plugin will automatically scan the source to find all `require(path)` calls to determine which additional modules need to be included in the output bundles (done recursively). For a `require` to automatically be detected it must be in the form `require("<module-name>")` or `require.resolve("<module-name>")`.

The [lasso-require](https://github.com/lasso-js/lasso-require) plugin will automatically wrap all Node.js modules so that the psuedo globals (i.e. `require`, `module`, `exports`, `__filename` and `__dirname`) are made available to the module source code.

The `lasso-require` plugin also supports [browserify shims](https://github.com/substack/node-browserify#compatibility) and [browserify transforms](https://github.com/substack/node-browserify/wiki/list-of-transforms).

For more details on how the Node.js modules are supported on the browser, please see the documentation for the [lasso-js-samples/lasso-require](https://github.com/lasso-js/lasso-require) plugin.

# Babel Support

The [lasso-babel-transform](https://github.com/lasso-js/lasso-babel-transform) module provides support for transpiling JavaScript/JSX code using [babel](https://babeljs.io/). Please see the [lasso-babel-transform](https://github.com/lasso-js/lasso-babel-transform) docs for information on how to use that transform.

# No Conflict Builds

If you're using CommonJS modules in your project then this will cause the
CommonJS runtime to be included in your build. The CommonJS runtime utilizes
a global variable (`$rmod` by default). If your build output files need to
co-exist with other JavaScript files that were built by Lasso separately
then you need to make sure that your build produces a CommonJS runtime
that is isolated from other builds. That is, you should not use the default
`$rmod` global.

To enable no-conflict build, you need to configure Lasso to use a unique
CommonJS runtime global name. This can be done by setting the `noConflict`
configuration property to string that is unique to your application or project.

If you're using the JavaScript API then this is possible via:

```javascript
// To configure the default Lasso for no-conflict builds:
require('lasso').configure({
    ...
    noConflict: 'myapp'
});

// To create a new Lasso for no-conflict builds
require('lasso').create({
    ...
    noConflict: 'myapp'
});

```

See [Configuration](#configuration) for full list of configuration options.

# Custom attributes for Script & Style tags
It is also possible to add custome attributes to script and style tags for both inline and external resources. It is done using the attributes `inline-script-attrs`, `inline-style-attrs`, `external-style-attrs` and `external-script-attrs` as shown below.

__page.marko__
```html
<lasso-page name="page" package-path="./browser.json"/>

<html>
    <head>
        <lasso-head external-style-attrs="{'css-custom1': true}"/>
        <lasso-slot name="ext-css-slot" external-style-attrs="{'css-custom2': true}"/>
        <lasso-slot name="css-slot" inline-style-attrs="{'css-custom3': true}"/>
    </head>
    <body>
        <lasso-body external-script-attrs="{'js-custom1': true}"/>
        <lasso-slot name="ext-js-slot" external-script-attrs="{'js-custom2': true}"/>
        <lasso-slot name="js-slot" inline-script-attrs="{'js-custom3': true}"/>
    </body>
</html>

```
__browser.json__
```json
{
    "dependencies": [
        { "path": "style-ext.css", "slot": "ext-css-slot" },
        { "path": "test-ext.js", "slot": "ext-js-slot" },
        "style.css",
        "test.js",
        { "path": "style-inline.css", "inline": true, "slot": "css-slot" },
        { "path": "test-inline.js", "inline": true, "slot": "js-slot" }
    ]
}
```
__Output HTML__
```html
<html>
    <head>
        <link rel="stylesheet" href="/static/page-1ae3e9bf.css" css-custom1>
        <link rel="stylesheet" href="/static/page-244694d6.css" css-custom2>
        <style css-custom3>
            body .inline {
    	        background-color: red;
	    }
	</style>
    </head>
    <body>
        <script src="/static/page-ce0ad224.js" js-custom1></script>
        <script src="/static/page-c3a331b0.js" js-custom2></script>
        <script js-custom3>
            console.log('hello-inline');
        </script>
    </body>
</html>
```
# Content Security Policy Support

Newer browsers support a web standard called Content Security Policy that
prevents, among other things, cross-site scripting attacks by whitelisting
inline `<script>` and `<style>` tags (see
[HTML5 Rocks: An Introduction to Content Security Policy](http://www.html5rocks.com/en/tutorials/security/content-security-policy/)).

## Securing Dynamically Built Pages
The Lasso.js taglib for Marko is used to inject the `<script>` and `<style>`
tags into the HTML output and Lasso.js provides support for injecting a nonce
attribute. When Lasso.js is configured you just need to register a
`cspNonceProvider` as shown below:

```javascript
require('lasso').configure({
    cspNonceProvider: function(out) {
        // Logic for determining the nonce will vary, but the following is one option:
        var res = out.stream;
        var nonce = res.csp && res.csp.nonce;

        // NOTE:
        // The code above assumes that there is some middleware that
        // stores the nonce into a [non-standard] `res.csp.nonce` variable.
        // Use whatever is appropriate for your app.
        return nonce; // A string value
    }
});
```

A Lasso.js plugin can also be used to register the CSP nonce provider as shown below:

```javascript
module.exports = function(lasso, pluginConfig) {
    lasso.setCSPNonceProvider(function(out) {
        return 'abc123';
    })
};
```

Registering a `cspNonceProvider` will result in a `nonce` attribute being added to all inline `<script>` and `<style>` tags rendered in either the `head` slot (`<lasso-head/>`) or the `body` slot (`<lasso-body/>`).


With a CSP nonce enable, the HTML output for a page rendered using Marko might be similar to the following:

```html
<html>
    <head>
        <!-- BEGIN head slot: -->
        <link rel="stylesheet" type="text/css" href="/static/page1-8b866529.css">
        <style type="text/css" nonce="abc123">
            body .inline {
                background-color: red;
            }
        </style>
        <!-- END head slot -->
    </head>
    <body>
        <!-- BEGIN body slot: -->
        <script type="text/javascript" src="/static/page1-1097e0f6.js"></script>
        <script type="text/javascript" nonce="abc123">
            console.log('hello-inline');
        </script>
        <!-- END body slot -->
    </body>
</html>
```

NOTE: A `nonce` attribute is only added to inline `<script>` and `<style>` tags.

As an extra convenience, Lasso.js also supports a custom `lasso-nonce`
attribute that can be dropped onto any HTML tag in your Marko template
files as shown below:

```xml
<script type="text/javascript" lasso-nonce>console.log('My inline script')</script>
<style type="text/css" lasso-nonce>.my-inline-style { }</style>
```

The output HTML will be similar to the following:

```html
<script type="text/javascript" nonce="abc123">console.log('My inline script')</script>
<style type="text/css" nonce="abc123">.my-inline-style { }</style>
```

## Securing Statically Built Pages

If your page is statically built (such as when creating a Single Page App)
then you should enable inline code fingerprinting which is way to whitelist
exactly which inline code blocks should be allowed. It is important to
emphasize, that a _nonce_ ("number once") will not properly secure a
statically built application since the HTML is built once which prevents
the nonce from changing. To secure your statically built application,
you should instead fingerprint all of the inline code blocks and include
these fingerprints in your CSP.

Here is an example of what CSP might look like if using SHA256 fingerprints:
`script-src 'self' 'sha256-viOn97JiWZ/fvh2VGIpROjZabjdtdrgtfO1wlPz9w7w='`

```javascript
require('lasso').configure({
    /* typical configuration goes here */

    // Configure Lasso with a function that will be called for fingerprinting
    // each inline code block...
    fingerprintInlineCode: function(code) {
        var shasum = crypto.createHash('sha256');
        shasum.update(code);
        return shasum.digest('base64');
    }
});

// This is the full list of fingerprints that were captured
// across all page builds
var inlineCodeFingerprints = [];

// Collect all of the fingerprints as each page is built
require('lasso').getDefaultLasso().on('afterLassoPage', function(event) {
    var lassoPageResult = event.result;
    var fingerprints = lassoPageResult.getInlineCodeFingerprints();
    fingerprints.forEach(function(fingerprint) {
        inlineCodeFingerprints.push(fingerprint);
    });
})

// NOW BUILD YOUR PAGES HERE
// ... build code goes here ...

// NOW BUILD YOUR CONTENT SECURITY POLICY:
var csp = inlineCodeFingerprints.map(function(fingerprint) {
    return `script-src 'self' 'sha256-${fingerprint}'`
}).join('; ');

```

# Available Plugins

Below is a list of plugins that are currently available:

__Core plugins:__

* [lasso-require](https://github.com/lasso-js/lasso-require): Node.js-style require for the browser (similar to [browserify](https://github.com/substack/node-browserify))
* [lasso-minify-css](https://github.com/lasso-js/lasso-minify-css): Minify CSS files using [sqwish](https://github.com/ded/sqwish)
* [lasso-minify-js](https://github.com/lasso-js/lasso-minify-js): Minify JavaScript files using [uglify-js](https://www.npmjs.org/package/uglify-js)
* [lasso-resolve-css-urls](https://github.com/lasso-js/lasso-resolve-css-urls): Replace each resource URL in a CSS file with an lassoed resource URL

__Third-party plugins__

* [lasso-dust](https://github.com/lasso-js/lasso-dust): Compile [Dust](https://github.com/linkedin/dustjs) template files to JavaScript
* [lasso-handlebars](https://github.com/lasso-js/lasso-handlebars): Compile [Handlebars](http://handlebarsjs.com/) template files to JavaScript
* [lasso-image](https://github.com/lasso-js/lasso-image): Get image info (including URL, width and height) for any image on both the server and client
* [lasso-imagemin](https://github.com/lasso-js/lasso-imagemin): Minify GIF, PNG, JPG and SVG images during optimization
* [lasso-jade](https://github.com/lasso-js/lasso-jade): Compile [Jade](http://jade-lang.com/) templates to JavaScript
* [lasso-jsx](https://github.com/lasso-js/lasso-jsx): Compile [JSX](http://facebook.github.io/react/docs/jsx-in-depth.html) files to JavaScript
* [lasso-less](https://github.com/lasso-js/lasso-less): Compile [Less](http://lesscss.org/) files to CSS
* [lasso-lodash](https://github.com/lasso-js/lasso-lodash): Compile [Lo-Dash](https://lodash.com/) files to JavaScript
* [lasso-marko](https://github.com/lasso-js/lasso-require): Compile [Marko template](https://github.com/marko-js/marko) files to JavaScript
* [lasso-sass](https://github.com/lasso-js/lasso-sass): Compile [Sass](https://github.com/sass/node-sass) files to CSS
* [lasso-stylus](https://github.com/lasso-js/lasso-stylus): Compile [Stylus](http://learnboost.github.io/stylus/) files to CSS
* [lasso-clean-css](https://github.com/yomed/lasso-clean-css): Minify CSS files using [clean-css](https://github.com/jakubpawlowicz/clean-css)
* [lasso-autoprefixer](https://github.com/lasso-js/lasso-autoprefixer): Autoprefix CSS with vendor prefixes using [autoprefixer-core](https://github.com/postcss/autoprefixer-core)
* [lasso-modernizr](https://github.com/darkwebdev/lasso-modernizr): Generate custom [Modernizr](https://modernizr.com) build
* [lasso-optimize-iife](https://github.com/austinkelleher/lasso-optimize-iife): Optimize JavaScript immediately-invoked functions using [optimize-js](https://github.com/nolanlawson/optimize-js)
* [lasso-rtl-css](https://github.com/shadiabuhilal/lasso-rtl-css): Transform CSS from left-to-right to right-to-left using [rtlcss](https://github.com/MohammadYounes/rtlcss)


To use a third-party plugin, you must first install it using `npm install`. For example:

```bash
npm install lasso-less --save
```

If you create your own plugin please send a Pull Request and it will show up above. Also, do not forget to tag your plugin with `lasso-plugin` and `lasso` in your `package.json` so that others can browse for it using [npm](https://www.npmjs.org/)

# Extending Lasso.js

Only read below if you are building plugins or transforms to further enhance the `lasso` module.

## Custom Plugins

A plugin can be used to change how the lasso operates. This includes the following:

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
* Configure the lasso
    * Examples:
        * Allow a plugin to automatically configure the lasso for production usage

A plugin is simply a Node.js module that exports a function with the following signature:

```javascript
/**
 * A plugin for Lasso.js
 * @param  {lasso/lib/Lasso} lasso An instance of a Lasso that can be configured
 * @param  {Object} The plugin configuration provided by the user
 */
module.exports = function(lasso, config) {
    // Register dependency types:
    lasso.dependencies.registerJavaScriptType('my-js-type', require('./dependency-my-js-type'));
    lasso.dependencies.registerStyleSheetType('my-css-type', require('./dependency-my-css-type'));
    lasso.dependencies.registerPackageType('my-package-type', require('./dependency-my-package-type'));

    // Add an output transform
    lasso.addTransform(require('./my-transform'));

    // Register a custom Node.js/CommonJS module compiler for a custom filename extension
    // var myModule = require('./hello.test');
    lasso.dependencies.registerRequireExtension('test', function(path, context, callback) {
        callback(null, "exports.sayHello = function() { console.log('Hello!'); }");
    });
};
```

## Custom Dependency Types

There are three types of dependencies that are supported:

* __JavaScript dependency:__ Produces JavaScript code
* __CSS dependency:__ Produces CSS code
* __Package dependency:__ Produces a package of additional JavaScript and CSS dependencies

Each of these dependencies is described in the next few sections. However, it is recommended to also check out the source code of [available plugins](#available-plugins) listed above (e.g. [lasso-less](https://github.com/lasso-js/lasso-less)).

### Custom JavaScript Dependency Type

If you would like to introduce your own custom dependency types then you will need to have your plugin register a dependency handler. This is illustrated in the following sample code:

```javascript
module.exports = function myPlugin(lasso, config) {
    lasso.dependencies.registerJavaScriptType(
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

Once registered, the above dependency can then be referenced from an `browser.json` as shown in the following code:

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
module.exports = function myPlugin(lasso, config) {
    lasso.dependencies.registerStyleSheetType(
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

lasso.dependencies.registerPackageType('dir', {
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

Registered output transforms are used to process bundles as they are written to disk. As an example, an output transform can be used to minify a JavaScript or CSS bundle. Another example is that an output transform may be used to remove `console.log` statements from output JavaScript code. Transforms should be registered by a plugin using the `lasso.addTransform(transform)` method.

As an example, the following unhelpful transform will convert all JavaScript source code to upper case:

```javascript
module.exports = function (lasso, pluginConfig) {
    lasso.addTransform({

        // Only apply to JavaScript code
        contentType: 'js', //  'css' is the other option

        // Give your module a friendly name (helpful for debugging in case something goes wrong in your code)
        name: module.id,

        // If stream is set to false then a String will be provided. Otherwise, a readable stream will be provided
        stream: false,

        // Do the magic:
        transform: function(code, lassoContext) {
            return code.toUpperCase();
        }
    });
};
```

Below is the streaming version of the same transform:

```javascript
var through = require('through');

module.exports = function (lasso, pluginConfig) {
    lasso.addTransform({

        // Only apply to JavaScript code
        contentType: 'js', // 'css' is the other option

        // Give your module a friendly name (helpful for debugging in case something goes wrong in your code)
        name: module.id,

        stream: true, // We want the code to be streamed to us

        // Do the magic:
        transform: function(inStream, lassoContext) {
            return inStream.pipe(through(
                function write(data) {
                    this.queue(data.toUpperCase());
                }));
        }
    });
};
```

# JavaScript API

See [JavaScript API](./docs/javascript-api.md).

# AMD Compatibility

See [AMD Compatibility](./docs/amd.md).

# Sample Projects

* [lasso-js-samples/lasso-async](https://github.com/lasso-js-samples/lasso-async): Demonstrates asynchronous/lazy dependency loading.
* [lasso-js-samples/lasso-cli](https://github.com/lasso-js-samples/lasso-cli): Demonstrates the command-line interface.
* [lasso-js-samples/lasso-code-splitting](https://github.com/lasso-js-samples/lasso-code-splitting): Demonstrates splitting out dependencies that are common across pages into a separate bundle.
* [lasso-js-samples/lasso-config](https://github.com/lasso-js-samples/lasso-config): Demonstrates the usage of a JSON config file.
* [lasso-js-samples/lasso-express](https://github.com/lasso-js-samples/lasso-express): Demonstrates using Lasso.js at runtime as part of an Express server app.
* [lasso-js-samples/lasso-js-api](https://github.com/lasso-js-samples/lasso-js-api): Demonstrates how to use JavaScript API to lasso a page and inject the resulting head and body markup into a page.
* [lasso-js-samples/lasso-taglib](https://github.com/lasso-js-samples/lasso-taglib): Demonstrates the use of the lasso taglib for Marko.
* [lasso-js-samples/lasso-templates](https://github.com/lasso-js-samples/lasso-templates): Demonstrates the use of rendering the same templates on both the server and the client.

# Discuss

Please join us in the [Gitter chat room for Lasso.js](https://gitter.im/lasso-js/lasso) or [open a new Github issue](https://github.com/lasso-js/lasso/issues).

# Maintainers

* [Patrick Steele-Idem](https://github.com/patrick-steele-idem) (Twitter: [@psteeleidem](http://twitter.com/psteeleidem))
* [Phillip Gates-Idem](https://github.com/philidem/) (Twitter: [@philidem](https://twitter.com/philidem))
* [Michael Rawlings](https://github.com/mlrawlings) (Twitter: [@mlrawlings](https://twitter.com/mlrawlings))

# Contributors

* Vinod Kumar (Twitter: [@vinodl](https://twitter.com/vinodl))
    - [gulp-lasso](https://github.com/marko-js/gulp-lasso)
    - [lasso-jsx](https://github.com/lasso-js/lasso-jsx)
* Merwan Rodriguez (Twitter: [@uno7](https://twitter.com/uno7))
    - [lasso-autoprefixer](https://github.com/lasso-js/lasso-autoprefixer)

# Contribute

Pull Requests welcome. Please submit Github issues for any feature enhancements, bugs or documentation problems.

# License

Apache License v2.0
