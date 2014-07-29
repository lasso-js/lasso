var raptorOptimizer = require('../');
var fs = require('fs');
var nodePath = require('path');
var raptorPromises = require('raptor-promises');
var cwd = process.cwd();
var raptorFiles = require('raptor-files');

function relPath(path) {
    return nodePath.relative(cwd, path);
}

function run(argv) {
    var parser = require('raptor-args').createParser({
            '--name -n': {type: 'string', description: 'The name of the page being optimized (e.g. "my-page")'},
            '--output-dir --out -o': {type: 'string', description: 'The output directory for static bundles and optimized page JSON files'},
            '--config -c': {type: 'string', description: 'Path to a JSON optimizer configuration file'},
            '--minify -m': {type: 'boolean', description: 'Enable JavaScript and CSS minification (disabled by default)'},
            '--fingerprint': {type: 'boolean', description: 'Include fingerprints in filenames'},
            '--help -h': {type: 'boolean', description: 'Show this help screen'},
            '--url-prefix -u': {type: 'string', description: 'URL prefix for resource bundles (e.g. "http://mycdn/")'},
            '--development --dev -d': {type: 'boolean', description: 'Enable development mode (no minification, bundling or fingerprints)'},
            '--production -prod': {type: 'boolean', description: 'Enable production mode (minification, bundling and fingerprints)'},
            '--base-path -b': {type: 'string', description: 'File system path used to calculate relative paths to generated bundles'},
            '--html -h': {type: 'boolean', description: 'Generate a JSON file that contains the HTML markup required to include the dependencies (organized by slot)'},
            '--html-dir': {type: 'boolean', description: 'Output directory for JSON files (defaults to "build")'},
            '--extensions -extension': {type: 'string[]', description: 'Extensions to enable'},
            '--inject-into --inject -i': {type: 'string[]', description: 'Pages to inject the slot HTML into'},
            '--main --entry -e': {type: 'string[]', description: 'The JavaScript module main entry for your app'},
            '--dependencies --dependency *': {type: 'string[]', description: 'Page dependencies'},
            '--plugins -plugin -p': {
                type: '[]', 
                description: 'Plugins to enable',
                options: {
                    '--module -m *': 'string',
                    '-*': null
                }
            },
            '--transforms -transform -t': {
                type: '[]', 
                description: 'Transforms to enable',
                options: {
                    '--module -m *': 'string',
                    '-*': null
                }
            }
        })
        .example('Optimize a single Node.js module for the browser', '$0 --main run.js --name my-page')
        .example('Optimize a set of dependencies', '$0 style.less foo.js template.rhtml')
        .example('Enable CSS and JS minification', '$0 style.less foo.js template.rhtml --name my-page --minify')
        .example('Change the output directory', '$0 style.less foo.js template.rhtml --name my-page --output-dir build')
        .validate(function(result) {
            if (result.help) {
                this.printUsage();
                process.exit(0);
            }

            if (!result.dependencies && !result.main) {
                this.printUsage();
                process.exit(1);
            }
        })
        .onError(function(err) {
            this.printUsage();

            if (err) {
                console.log();
                console.log(err);
            }

            process.exit(1);
        })
        .usage('Usage: $0 [depdendency1, dependency2, ...] [OPTIONS]');

    var args = parser.parse(argv);

    var config = args.config;
    var configDir;

    if (typeof config === 'string') {
        configDir = nodePath.dirname(config);
        config = JSON.parse(fs.readFileSync(config, {encoding: 'utf8'}));
    } else if (!config) {
        config = {};
    }

    var fileWriter = config.fileWriter || (config.fileWriter = {});

    if (args.outputDir) {
        fileWriter.outputDir = nodePath.resolve(cwd, args.outputDir);
    }

    if (args.urlPrefix) {
        fileWriter.urlPrefix = args.urlPrefix;
    }

    

    if (!fileWriter.outputDir) {
        fileWriter.outputDir = nodePath.join(cwd, 'static');
    }

    var transforms = args.transforms || [];

    if (args.development) {
        config.bundlingEnabled = false;
        fileWriter.fingerprintsEnabled = false;
    } else if (args.production) {
        config.bundlingEnabled = true;
        transforms.push('raptor-optimizer-minify-js');
        transforms.push('raptor-optimizer-minify-css');
        fileWriter.fingerprintsEnabled = true;
    } else {
        if (args.minify) {
            transforms.push('raptor-optimizer-minify-js');
            transforms.push('raptor-optimizer-minify-css');
        }

        if (args.fingerprint) {
            fileWriter.fingerprintsEnabled = true;
        }
    }

    var extensions = {};
    if (args.extensions) {
        args.extensions.forEach(function(ext) {
            ext.split(/\s*,\s*/).forEach(function(extName) {
                extensions[extName] = true;
            });
        });
    }

    var dependencies = args.dependencies;

    if (args.main && args.main.length) {
        dependencies = dependencies || [];
        args.main.forEach(function(main) {
            dependencies.push('require-run:' + nodePath.resolve(cwd, main));
        });
    }

    extensions = extensions && extensions.length ? Object.keys(extensions) : null;

    if (transforms.length) {
        config.transforms = config.transforms ? config.transforms.concat(transforms) : transforms;    
    }

    var name = args.name;

    console.log('Config: ' + JSON.stringify(config, null, 4));

    config.projectRoot = cwd;

    var pageOptimizer = raptorOptimizer.create(config, configDir || cwd);

    var promises = [];
    var failedCount = 0;

    var optimizedPages = {}; 

    function optimizePage(config) {
        var pageName = config.name || config.pageName;
        if (args.basePath) {
            config.basePath = args.basePath;
        }

        console.log('Optimizing page "' + pageName + '"...');
        var promise = pageOptimizer.optimizePage(config)
                .then(function(optimizedPage) {
                    console.log('Successfully optimized page "' + pageName + '"!');
                    optimizedPages[pageName] = optimizedPage;
                })
                .fail(function(e) {
                    console.error('Failed to optimize page "' + pageName + '"! Reason: ' + (e.stack || e));
                    failedCount++;
                });

        promises.push(promise);
    }

    if (dependencies && dependencies.length) {
        optimizePage({
                name: name || 'unnamed',
                dependencies: dependencies
            });
    } else if (args.name) {
        var pageConfig = config.pages ? config.pages[name] : null;
        if (!pageConfig) {
            throw 'Page not registered with name "' + name + '"';
        }

        optimizePage(pageConfig);
    } else {
        var pageNames = config.pages ? Object.keys(config.pages) : [];
        if (!pageNames.length) {
            throw new Error('No pages found in config');
        }

        pageNames.forEach(function(pageName) {
            var pageConfig = pageOptimizer.config.pages[pageName];
            optimizePage(pageConfig);
        });
    }

    var htmlDir = nodePath.resolve(cwd, args.htmlDir || 'build');

    raptorPromises.allSettled(promises)
        .then(function() {
            /* jshint loopfunc:true */
            var pageNames = Object.keys(optimizedPages);
            if (pageNames.length) {
                for (var pageName in optimizedPages) {
                    if (optimizedPages.hasOwnProperty(pageName)) {
                        var optimizedPage = optimizedPages[pageName];
                        var lines = ['------------------------------------'];
                        lines.push('Output for page "' + pageName + '":');
                        lines.push('  Resource bundle files:\n    ' + optimizedPage.getOutputFiles()
                            .map(function(path) {
                                return relPath(path);
                            })
                            .join('\n    '));

                        if (args.html !== false) {
                            var htmlFile = nodePath.resolve(htmlDir, pageName + '.html.json');
                            raptorFiles.mkdirs(htmlFile);
                            lines.push('  HTML slots file:\n    ' + relPath(htmlFile));
                            fs.writeFile(htmlFile, optimizedPage.toJSON(4), {encoding: 'utf8'}, function(err) {
                                if (err) {
                                    console.error('Failed to save HTML slots to file "' + htmlFile + '". Error: ' + (err.stack || err));    
                                }
                                
                            });
                        }

                        if (args.injectInto && args.injectInto.length) {
                            args.injectInto.forEach(function(target) {
                                target = nodePath.resolve(cwd, target);
                                var targetHtml = fs.readFileSync(target, {encoding: 'utf8'});
                                var injector = require('../lib/html-injector');
                                targetHtml = injector.inject(targetHtml, optimizedPage);
                                fs.writeFileSync(target, targetHtml, {enconding: 'utf8'});
                                lines.push('  Updated HTML file:\n    ' + relPath(target));
                            });
                            
                        }

                        console.log(lines.join('\n'));
                    }
                }                
            }
            
            console.log('------------------------------------');
            if (failedCount) {
                console.error(failedCount + ' page(s) failed to optimize');
                process.exit(1);
            } else {
                console.log('\nAll pages successfully optimized!');
            }
        })
    .fail(function(e) {
        console.error('Uncaught exception: ' + (e.stack || e));
        process.exit(1);
    });
}

module.exports = run;