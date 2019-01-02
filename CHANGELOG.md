Changelog
=========

# 3.2.8

- Fix regression with inline scripts with `externalScriptAttrs`.

# 3.2.7

- Improve support for `defer` and `async` attributes on inline bundles.

# 3.0.0

- **BREAKING**: Remove support for Node 4
    - Significant refactors. Move to async/await internally.
    - Traspile for Node 4 support using Babel
- **BREAKING**: API methods no longer expose callbacks.
    - Plugins should no longer expect a callback
    - Plugins should return promises for async tasks
- **BREAKING**: Marko taglib and taglib-v2 removed
    - Use `@lasso/marko-taglib` instead
- Support for passing `cacheKey` property to lasso config
- Merge `lasso-require` into Lasso
    - Lasso config `lassoConfig.require.resolver` property has been split out
    into its own property `lassoConfig.resolver`

```js
const lassoConfig: {
    require: {
        transforms: ...
    },
    resolver: {
        builtins: {
            ...
        }
    }
}

const lasso = lasso.create(lassoConfig);
```

- Lasso writers now support async `init` functions

```js
module.exports = function(lasso, config) {
    lasso.config.writer = {
        async init (lassoContext) {
            await Promise.resolve();
        },

        async writeBundle (reader, lassoContext) {
            const bundle = lassoContext.bundle;
            bundle.url = 'test.com';
        },

        async writeResource (reader, lassoContext) {
            return { url: 'test.com' };
        }
    };
};
```

# 2.x

## 2.9.x

### 2.9.0

- Fixes #186 - Allow custom require handler to implement getDependencies

## 2.8.x

### 2.8.5

- Use [resolve-from](https://github.com/sindresorhus/resolve-from) to first try and resolve `browser.json`

### 2.8.4

- Fixes #185 - DependencyRegistry has an undefined stream when using `mask-define` for AMD dependencies
- Increasing default timeout to 10s
- Other minor internal changes

### 2.8.3

- Internal: use `renderToString` instead of `renderSync` ([PR #182](https://github.com/lasso-js/lasso/pull/182) by [@yomed](https://github.com/yomed))

### 2.8.2

- Fixed #180 - Defining bundles with "intersection" does not work for "require" dependencies

### 2.8.2

- Fixed #180 - Defining bundles with "intersection" does not work for "require" dependencies

### 2.8.1

- Fixed #178 - Cache key changes when lasso is reconfigured even if config did not change

### 2.8.0

- Fixed #173 - Bundle attributes

## 2.7.x

### 2.7.0

- Restored Marko v2 compatibility

## 2.6.x

### 2.6.1

- Fixes #171 - Write cache key information to disk for debugging purposes

### 2.6.0

- Added support for a new `relativeUrlsEnabled` configuration option ([PR #167](https://github.com/lasso-js/lasso/pull/167) by [@reid](https://github.com/reid))
- Upgraded [glob](https://www.npmjs.com/package/glob) version ([PR #166](https://github.com/lasso-js/lasso/pull/166) by [@yomed](https://github.com/yomed))
- Docs: various improvements to documentation by ([@yomed](https://github.com/yomed))

## 2.5.x

### 2.5.9

- Introduced Koa-compatible middleware ([PR #163](https://github.com/lasso-js/lasso/pull/163) by [@yomed](https://github.com/yomed))

### 2.5.8

- Added tests for #160 - lastSlot configuration option for the require plugin

### 2.5.7

- Upgraded to `raptor-util@2.0.0`

### 2.5.6

- Fixed #156 - Lasso is generating very long names in development triggering `ENAMETOOLONG` error [PR #157](https://github.com/lasso-js/lasso/pull/157) from [@mlrawlings](https://github.com/mlrawlings)

### 2.5.5

- Fixes #147 - EPERM 'operation not permitted' on rename
- Fixes #148 - css urls resolved incorrectly with multiple pages when bundling disabled
- Testing: Don't actually read external URLs when running tests

### 2.5.4

- Fixes #149 - if-flag is ignored in async section of browser.json

### 2.5.3

- Updated taglib type and autocomplete information for tooling
- Docs: Added [Michael Rawlings](https://github.com/mlrawlings) as a maintainer

### 2.5.2

- Added `null`/`undefined` when building async loader metadata

### 2.5.1

- Fixed #146 - Slot timeout causes other slots to timeout

### 2.5.0

- Loader metadata for lazily loading packages is no longer stored in a global variable and is instead integrated with the lasso modules client runtime. This change prevents separate lasso builds of JavaScript libraries from conflicting with each other when both added to the same web page.

### 2.4.2

- Code cleanup for base64 encoding

### 2.4.1

- Fixes #143 - Only encode new lines when using utf8 encoding for data uri

### 2.4.0

- Fixes #141 - Add support for UTF8 encoding inline images in CSS files

## 2.3.x

### 2.3.6

- Fixes #137 - Don't allow double callbacks in case of multiple errors on the same read stream

### 2.3.5

- Fixes #136 - Just use a unique ID for packages if calculateKey() is not implemented
- Added new events: `beforeAddDependencyToAsyncPageBundle`, `beforeAddDependencyToSyncPageBundle`

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

### 2.3.4

- Fixed #135 - Incorrect key is calculated for require dependencies in `browser.json` files in some situations

### 2.3.3

- Fixed #134 - The `<lasso-img>` tag breaks bundling when included in a template sent to the browser
- Fixed #133 - The dependency chain should be included in error messages when walking a dependency graph

### 2.3.2

- Fixed #130 - check inline minification config value ([@yomed](https://github.com/yomed))
- Updated docs and tests

### 2.3.1

- Minor cleanup

### 2.3.0

- Fixes #84 - Allow minification to only be enabled for inline resources
- Switched from `jsonminify` to `strip-json-comments`

## 2.2.x

### 2.2.2

- Fixes #128 - getLastModified is broken when using registerRequireType

### 2.2.1

- JavaScript comments are now stripped before parsing JSON config files

### 2.2.0

- Significant improvements to performance and stability
- Resolved issues related to caching and development mode

## 2.1.x

### 2.1.1

- Fixes #116 - Conditional requireRemap is broken

### 2.1.0

- Fixes #115 - Allow conditional dependencies to be grouped

## 2.0.x

### 2.0.1

- `registerRequireType`, switch condition blocks [PR #113](https://github.com/lasso-js/lasso/pull/113)

### 2.0.0

- Marko v3 compatibility

# 1.x

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
