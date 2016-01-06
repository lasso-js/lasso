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

## 1.10.x

### 1.12.0

- Fixes https://github.com/lasso-js/lasso-minify-js/issues/1 - Upgrade to the latest version of UglifyJS

### 1.12.3

- Adds support for `noConflict` lasso configuration option

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
