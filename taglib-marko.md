Optimizer Taglib for Marko
==========================

The [Optimizer](README.md) includes a taglib for Marko for easily injecting `<script>` and `<link>` tags into a page, as well as resource URLs for images and other types of front-end resources.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Table of Contents

- [Example](#example)
- [Tags](#tags)
    - [`<optimizer-page>`](#optimizer-page)
    - [`<optimizer-head>`](#optimizer-head)
    - [`<optimizer-body>`](#optimizer-body)
    - [`<optimizer-img>`](#optimizer-img)
    - [`<optimizer-resource>`](#optimizer-resource)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation

Since the optimizer taglib is part of the `optimizer` module you only need to install the `optimizer` module to use this taglib:

```bash
npm install optimizer --save
```

# Example Template

```html
<optimizer-page name="my-page" package-path="./browser.json"/>

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

Output HTML will be similar to the following:

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

# Tags

## `<optimizer-page>`

Optimizes the page so that the resulting JavaScript and CSS resources can be injected into the output HTML. The `<optimizer-head>` and `<optimizer-body>` tags are used as insertion points. By default, all CSS `<link>` tags will be added to the `<optimizer-head>` slot and all `<script>` tags will be added to the `<optimizer-body>` slot.

Supported attributes:

- __name__ (string) - The name of the page (used to determine the name of output page bundles). Defaults to the name of the parent directory if not provided.
- __cache-key__ (string) - The cache key that should be used to cache the optimized page. Defaults to the template path. NOTE: The set of enabled flags are always appended to the cache key.
- __package-path__ (string) - The relative path to the the JSON file that declares the top-level page dependencies.
- __package-paths__ (Array) - Similar to `package-paths`, but an Array of paths.
- __optimizer__ (expression) - A reference to a `PageOptimizer` instance. Defaults to the default page optimizer (i.e. `require('optimizer').getDefaultPageOptimizer()`)
- __data__ (expression) - Optional data to copy into the `optimizerContext.data` object.
- __dependencies__ (expression) - An array of dependencies to optimize.
- __flags__ (expression) - An array of flags to enable during optimization
- __timeout__ (integer) - The maximum time to allow for the optimization to complete before throwing an error

Examples:

_With a path to an `browser.json` file:_

```html
<optimizer-page package-path="./browser.json"/>
```

_With an explicit page name flags:_

```html
<optimizer-page name="home" package-path="./browser.json"/>
```

_With enabled flags:_

```html
<optimizer-page package-path="./browser.json" flags="['foo', 'bar']"/>
```

_With dependencies:_

```html
<optimizer-page dependencies="['foo.js', 'bar.css']"/>
```

## `<optimizer-head>`

The head slot that is used as the marker for inserting CSS `<link>` tags in the head section of the HTML page.

## `<optimizer-body>`

The body slot that is used as the marker for inserting JavaScript `<script>` tags in the body section of the HTML page.

## `<optimizer-img>`

Optimizes an image resource and renders an `<img>` tag with the `src` attribute set to the resulting URL of the optimized image resource.

Supported attributes:

- __src__ - The relative path to the image resource
- __*__ - All other attributes will pass through to the `<img>` tag

Example:

```html
<optimizer-img src="./foo.png" width="32" height="32" class="foo">
```

The output will be similar to the following:

```html
<img src="/static/foo-1b4c0db.png" width="32" height="32" class="foo">
```

## `<optimizer-resource>`

Optimizes an arbitrary resource and introduces a local variable that can be used to inject the resulting resource URL into the page.

Supported attributes:

- __path__ - The relative path to the resource to optimize
- __var__ - The name of the local variable to introduce

Example:

```html
<optimizer-resource path="./favicon.ico" var="favicon"/>
<link rel="shortcut icon" href="${favicon.url}">
```

The output will be similar to the following:

```html
<link rel="shortcut icon" href="/static/favicon-c3deb101.ico">
```