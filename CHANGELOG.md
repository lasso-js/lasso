Changelog
=========

# Upgrade guide

## Optimizer.js to Lasso.js

- Uninstall old modules:
  - `npm uninstall optimizer --save`
  - `npm uninstall optimizer-marko --save`
  - etc.
- Install new modules
  - `npm install lasso --save`
  - `npm install lasso-marko --save`
  - etc.
- API changes
  - `require('optimizer')` → `require('lasso')`
  - `optimizer.optimizePage(...)` → `lasso.lassoPage(...)`
- Rename `optimizer.json` files to `browser.json`
- Rename `*.optimizer.json` files to `*.browser.json`
- Update Marko custom tags:
  - Rename `<optimizer-page>` to `<lasso-page>`
  - Rename `<optimizer-head>` to `<lasso-head>`
  - Rename `<optimizer-body>` to `<lasso-body>`
- browser.json changes
  - remove unnecessary spacing:  e.g. convert "require :" to "require:"

# 1.x

## 1.20.x

### 1.20.0

- Fixes #141 - Add support for UTF8 encoding inline images in CSS files

## 1.19.x

### 1.19.2

- Fixes #140 - Don't escape XML for slot HTMLs

### 1.19.1

- Fixes #137 - Don't allow double callbacks in case of multiple errors on the same read stream

### 1.19.0

- Plugins API: Added support for new events: `beforeAddDependencyToAsyncPageBundle`, `beforeAddDependencyToSyncPageBundle`

Example plugin:

```javascript
module.exports = exports = function(lasso, config) {
    lasso.on('beforeBuildPage', (event) => {
        var context = event.context;

        context.on('beforeAddDependencyToSyncPageBundle', (event) => {
            var dependency = event.dependency;

        });

        context.on('beforeAddDependencyToAsyncPageBundle', (event) => {
            var dependency = event.dependency;

        });
    });
};
```

## 1.18.x

### 1.18.2

- Fixes #136 - Just use a unique ID for packages if calculateKey() is not implemented

### 1.18.1

- Fixes #130 - check inline minification config value

### 1.18.0

- Fixes #84 - Handle minification separately for inline resources

## 1.17.x

### 1.17.1

- Fixes #116 - Conditional requireRemap is broken

### 1.17.0

- Fixes #115 - Allow conditional dependencies to be grouped

## 1.16.x

### 1.16.1

- Adds support for fingerprinting inline code blocks for purpose of creating Content Security Policy (CSP) that secures statically built app.

### 1.16.0

-  Added support for custom attributes on script and style tags for slots

## 1.15.x

### 1.15.0

- Adds support for injecting a Content Security Policy nonce into inline script and style tags. Fixes [Issue #93](https://github.com/lasso-js/lasso/issues/93)

## 1.14.x

### 1.14.0

- Fixed #100 - Removed type attributes from `<script>`, `<link>` and `<style>` tags, as recommended for HTML5 best practices.

## 1.13.x

### 1.13.4

- Allow dependencies to choose default bundle name by implementing getDefaultBundleName(pageBundleName, lassoContext)

### 1.13.3

- Added test for https://github.com/lasso-js/lasso-require/issues/21

### 1.13.2

- Fixed #95 - Further sanitize relative bundle paths that are used to determine output file

### 1.13.1

- Improved name generation for unbundled dependencies
- Better OS file separator handling

### 1.13.0

- Adds support for `noConflict` lasso configuration option

## 1.12.x

### 1.12.0

- Fixes https://github.com/lasso-js/lasso-minify-js/issues/1 - Upgrade to the latest version of UglifyJS

### 1.11.12

- Fixes [#82](https://github.com/lasso-js/lasso/issues/82) - Make lasso a true singleton

### 1.11.11

- Minor correction in calculateConfigFingerprint code

### 1.11.10

- Added mask-define option for resource dependencies

### 1.11.9

- Changes to keep Lasso taglib compatible with older versions of `marko`

### 1.11.8

- Upgraded the marko dev dependency

### 1.11.7

- Documentation: Improved docs

### 1.11.6

- Documentation: Improved docs

### 1.11.5

- Fixesd [#77](https://github.com/lasso-js/lasso/issues/77) - <lasso-img> now works on the server and in the browser
- Builtin es6 support for `.es6` files
- Documentation: Added docs for #77

### 1.11.4

- Only enable the browser-refresh special reloads once

### 1.11.3

- Add web fonts to browser-refresh

### 1.11.2

- Fixed circular require issues for browser-refresh

### 1.11.1

- browser-refresh is now auto enabled.
- Code and docs cleanup

### 1.10.4

- Fixed #76 Auto switch to development mode when browser-refresh is enabled

### 1.10.3

- Fixed #75 - Generate config cache key in a stable way
- Documentation: new plugin: [lasso-autoprefixer](https://github.com/lasso-js/lasso-autoprefixer): Autoprefix CSS with vendor prefixes using [autoprefixer-core](https://github.com/postcss/autoprefixer-core)
- Documentation: Fixed #61 - Improve documentation for external resource dependencies

### 1.10.2

- Documentation: new third party plugin: [lasso-clean-css](https://github.com/yomed/lasso-clean-css)

### 1.10.1

- Fixed [#62](https://github.com/lasso-js/lasso/issues/62) - Invalidate the default lasso instance on configure

### 1.10.0

- Fixed [#57](https://github.com/lasso-js/lasso/issues/57) - Allow non-JavaScript modules to be required:

```javascript
require('lasso/node-require-no-op').enable('.less', '.css');

// ...

require('./style.less');
```

### 1.9.0

## 1.9.x

### 1.9.1

- Internal: Switched from "raptor-async/DataHolder" (deprecated) to "raptor-async/AsyncValue"

### 1.9.0

- [Issue #48](https://github.com/lasso-js/lasso/issues/48): Do not mangle bundle names
- [Issue #49](https://github.com/lasso-js/lasso/issues/49): Enhance LassoPageResult to fetch info by bundle name

## 1.8.x

### 1.8.6

- Renamed Optimizer to Lasso
