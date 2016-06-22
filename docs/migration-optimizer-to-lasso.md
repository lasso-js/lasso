Optimizer.js to Lasso.js Upgrade Guide
======================================

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
