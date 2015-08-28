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
