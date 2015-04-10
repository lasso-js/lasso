Lasso.js Bundling
====================================

Bundling can either be enabled or disabled during page optimization. If bundling is disabled then every dependency will be written to its own file. If bundling is enabled then dependencies will be concatenated together based on the bundles configured for the application and page. Lasso.js allows both application-level and page-level bundles to be configured.

# Application-level Bundles

Application-level bundles are bundles that apply to every page that are lassoed. Application-level bundles allow for consistant bundles across pages when pages have common dependencies. Application-level bundles are typically configured as part of the lasso configuration as show below:

```json
{
    ...
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

While assigning dependencies to bundles during a page optimization, if the lasso detects that a dependency is part of a application-level bundle then that bundle will be added to the list of output bundles for the page and result in either a `<script>` or `<link>` tag including the resource associated with the application-level bundle.

# Page-level Bundles

The lasso also allows for page-level to be configured when optimizing a particular page. Application-level bundles always take precedence over page-level bundles. Page-level bundles can be configured when optimizing a page as shown in the following example JavaScript code:

```javascript
require('lasso').lassoPage({
        name: "my-page",
        dependencies: [
            ...
        ],
        bundles: [
            {
                name: "foo",
                dependencies: [
                    "require: ./foo"
                ]
            }
        ]
    });
```

If you are using the taglib, page-level bundles can be passed in as part of the attributes. For example, with Marko:

```html
<lasso-page package-path="./browser.json" bundles="./lasso-bundles.json"/>
```

# Recursive Dependencies and Bundling

When assigning a dependency to a bundle it is possible that a particular package dependency might have additional dependencies. Lasso.js gives you control over how transitive dependencies are handled via a special "recurse into" option. The possible values for "recurse into" option are the following:

* __`"all"`:__ All transitive dependencies, regardless of where they are located on disk, will be added to the bundle.
* __`"dir"`:__ Only transitive dependencies that are in the exact same directory associated with the root dependency will be added to the bundle.
* __`"dirtree"`:__ Only transitive dependencies that are in the same directory associated with the root dependency _or_ within a nested directory associated with the root dependency will be added to the bundle.
* __`"module"`:__ Only dependencies that are within the root directory of the module associated with the root dependency will be added to the bundle unless the transitive dependency is a directory under the root module's `node_modules` directory.

The "recurse into" option can be specified using the `recurseInto` property at the bundle level or at the dependency level as shown in the following sample code:

```javascript
require('lasso').lassoPage({
        name: "my-page",
        dependencies: [
            ...
        ],
        bundles: [
            {
                name: "foo",
                dependencies: [
                    // Specified for a single dependency:
                    { path: "require: foo", recurseInto: "dir" }
                ]
            },
            {
                name: "bar",
                dependencies: [
                    "require: bar"
                ],
                // Specified at the bundle level:
                reurseInto: "dir"
            }
        ]
    });
```

_NOTE: the "require" dependency type is implemented as a package dependency since it can resolve to additional transitive dependencies based on which modules are required inside the JavaScript source code._

To hopefully make things clear, let's assume we have the following project structure:

```
.
├── main.js
└── node_modules
    ├── foo
    │   ├── index.js
    │   ├── lib
    │   │   └── foo.js
    │   └── node_modules
    │       └── bar
    │           └── index.js
    └── baz
        └── index.js
```

Let's assume that we have the following transitive dependencies:

```
require('./main.js') →
└── require('foo') →
    └── require('node_modules/foo/index.js')
        └── require('node_modules/foo/lib/foo.js')
            ├── require('bar')
            │   └── require('node_modules/foo/node_modules/bar/index.js')
            └── require('baz')
                └── require('node_modules/baz/index.js')
```

Let's try optimizing our `main.js` with different bundling options:

__Option 1) all:__

```json
{
    ...
    "bundles": [
        {
            "name": "foo",
            "dependencies": [
                { "path": "require: foo", "recurseInto": "all" }
            ]
        }
    ]
}
```

Content of the "foo" bundle:

* `node_modules/foo/index.js`
* `node_modules/foo/lib/foo.js`
* `node_modules/foo/node_modules/bar/index.js`
* `node_modules/baz/index.js`

__Option 2) dir:__

```json
{
    ...
    "bundles": [
        {
            "name": "foo",
            "dependencies": [
                { "path": "require: foo", "recurseInto": "dir" }
            ]
        }
    ]
}
```

Content of the "foo" bundle:

* `node_modules/foo/index.js`

__Option 3) dirtree:__

```json
{
    ...
    "bundles": [
        {
            "name": "foo",
            "dependencies": [
                { "path": "require: foo", "recurseInto": "dirtree" }
            ]
        }
    ]
}
```

Content of the "foo" bundle:

* `node_modules/foo/index.js`
* `node_modules/foo/lib/foo.js`
* `node_modules/foo/node_modules/bar/index.js`

__Option 4) module:__

```json
{
    ...
    "bundles": [
        {
            "name": "foo",
            "dependencies": [
                { "path": "require: foo", "recurseInto": "module" }
            ]
        }
    ]
}
```

Content of the "foo" bundle:

* `node_modules/foo/index.js`
* `node_modules/foo/lib/foo.js`
