

    
var files = require('raptor/files'),
    resources = require('raptor/resources'),
    optimizer = require('raptor/optimizer'),
    File = require('raptor/files/File'),
    endsWith = require('raptor/strings').endsWith,
    logger = require('raptor-logging').logger(module),
    cwd = process.cwd();

module.exports = {
    
    run: function(args) {
        
        
        var pageName,
            packageManifest = null,
            packagePath,
            dependencies = [],
            sourceDirs,
            configPath,
            outputDirPath = null,
            minify,
            params,
            includeChecksums = false,
            urlPrefix = null,
            developmentMode = false,
            generateHtmlSlotsFile = false,
            enabledExtensions = null,
            basePath,
            parseDependencies = function(dependencies) {
                var asyncFound = false;
                    
                dependencies.forEach(function(dependency, i) {
                    
                    if (dependency.endsWith("?") || dependency.startsWith("?")) {
                        if (dependency.endsWith("?")) {
                            dependency = dependency.substring(0, dependency.length-1);
                        }
                        else {
                            dependency = dependency.substring(1);
                        }
                        dependencies[i] = { "module": dependency, "async": true };
                        asyncFound = true;
                    }
                    else if (dependency.startsWith('/')) { //Treat
                        if (endsWith(dependency, "package.json")) {
                            dependencies[i] = { "package":  dependency};
                        }
                        else {
                            dependencies[i] = { "path":  dependency};
                        }
                    }
                    else if (dependency.startsWith('./')) {
                        dependency = resolveFile(dependency).getAbsolutePath();
                        if (endsWith(dependency, "package.json")) {
                            dependencies[i] = { "package":  dependency};
                        }
                        else {
                            dependencies[i] = { "path":  dependency};
                        }
                    }
                    else if (dependency.endsWith("package.json")) {
                        dependency = resolveFile(dependency).getAbsolutePath();
                        dependencies[i] = { "package":  dependency};
                    }
                    else {
                        dependencies[i] = { "module": dependency };
                    }
                });
                
                if (asyncFound) {
                    dependencies.push({"module": "raptor/loader"});
                    dependencies.push({"type": "loader-metadata"});
                }
            };
            

        var resolveFile = function(path) {
            if (!path) {
                return path;
            }
            
            return new File(files.resolvePath(cwd, path));
        };


        
        var argv = require('optimist')(args)
            .usage('Usage: $0 [dependency-1] [dependency-2] [dependency-n] [options]\nExamples:\n' + 
                   '  Optimize a set of dependencies:\n' + 
                   '   $0 my-module /some-resource.js --name test-page --source=path/to/my-modules\n\n' + 
                   '  Optimize a package:\n' + 
                   '   $0 --name test-page --package path/to/package.json --source=path/to/my-modules\n\n' + 
                   '  Optimize using a configuration file:\n' + 
                   '   $0 --name test-page --package path/to/package.json --source=path/to/my-modules --config path/to/optimizer-config.xml\n\n' + 
                   '  Optimize all of the pages defined in a configuration file:\n' + 
                   '   $0 --config path/to/optimizer-config.xml\n' + 
                   '\n' +
                   'NOTE: Modules to download asynchronously should be suffixed with a question mark. For example:\n' + 
                   '  Optimize a page with an asynchronous dependency:\n' + 
                   '   $0 my-module my-async-module? --name test-page\n')
            .alias('n', 'name')
            .describe('n', 'The name of the page being optimized (e.g. "my-page")')
            .alias('p', 'package')
            .describe('p', 'A package manifest describing page dependencies')
            .alias('o', 'out')
            .describe('o', 'The output directory for static bundles and optimized page JSON files')
            .alias('s', 'source')
            .describe('s', 'A comma-separated list of source directories to search for modules and resources')
            .alias('c', 'config')
            .describe('c', 'Path to an optimizer XML configuration file')
            .alias('m', 'minify')
            .boolean('m')
            .describe('m', 'Enable JavaScript and CSS minification (disabled by default)')
            .describe('checksum', 'Include checksums for files')
            .boolean('checksum')
            .describe('help', 'Display this usage information')
            .alias('u', 'url-prefix')
            .describe('u', 'URL prefix for resource bundles')
            .alias('d', 'development')
            .describe('d', 'Enable developer-friendly mode')
            .boolean('d')
            .alias('b', 'base-path')
            .describe('b', 'Base path for generating URLs')
            .alias('h', 'html')
            .describe('h', 'Generate a JSON file that contains the HTML markup required to include the dependencies (organized by slot)')
            .alias('e', 'extensions')
            .describe('e', 'Comma separated list of enabled extensions')
            .boolean('html')
            .check(function(argv) {
                if (argv['help']) {
                    throw '';
                }

                if (args.length === 2) {
                    throw '';   
                }

                pageName = argv['name'];
                packagePath = argv['package'];
                sourceDirs = argv['source'];
                configPath = argv['config'];
                outputDirPath = argv['out'];
                minify = argv['minify'];
                includeChecksums = argv['checksum'] === true;
                generateHtmlSlotsFile = argv['html'] === true;
                enabledExtensions = argv['extensions'];

                if (enabledExtensions) {
                    enabledExtensions = enabledExtensions.split(/\s*[,]\s*/);
                }

                params = argv._;
                if (params) {
                    var parsedParams = {};
                    for (var i=2, len=params.length, param; i<len; i++) {
                        param = params[i];
                        var eqIndex = param.indexOf('=');
                        if (eqIndex != -1) {
                            var name = param.substring(0, eqIndex);
                            var value = param.substring(eqIndex+1);
                            if (value === 'true') {
                                value = true;
                            }
                            else if (value === 'false') {
                                value = true;
                            }
                            parsedParams[name] = value;
                        }
                        else {
                            dependencies.push(param);
                        }
                    }
                    params = parsedParams;
                }

                if (!dependencies.length && resolveFile("package.json").exists()) {
                    dependencies.push("package.json");
                }

                parseDependencies(dependencies);

                if (outputDirPath) {
                    outputDirPath = resolveFile(outputDirPath);
                }
                
                if (configPath) {
                    var configFile = resolveFile(configPath);
                    if (!configFile.exists()) {
                        throw 'Configuration file not found at path "' + configPath + '".';
                    }
                    optimizer.configure(configFile, params);
                }


                if (packagePath) {
                    packagePath = resolveFile(packagePath);
                    if (!packagePath.exists()) {
                        throw 'Package manifest not found at path "' + packagePath + '".';
                    }

                    packageManifest = require('raptor-packaging').getPackageManifest(resources.createFileResource(packagePath));
                }

                if (dependencies.length && argv['package']) {
                    throw 'Invalid Options. Dependencies cannot be provided in conjunction with the "package" option.';
                }

                if (!dependencies.length && !argv['package']) {
                    //Maybe we can find the package manifest from the page configured in the optimizer config...
                    
                    if (!argv['config']) {
                        throw 'Invalid Options. Either dependencies must be provided or the "package" or "config" option must be provided.';    
                    }
                    else if (argv['name']) {
                        //See if a page config with the provided name exists in the configuration file
                        var pageConfig = optimizer.getDefaultPageOptimizer().getConfig().getPageConfig(pageName);
                        if (!pageConfig) {
                            throw 'Invalid Options. Page with name "' + pageName + '" not found in configuration file at path "' + configPath + '".';    
                        }

                        packageManifest = pageConfig.getPackageManifest();
                        if (!packageManifest) {
                            throw 'Invalid Options. Page with name "' + pageName + '" does not have any dependencies defined in found in configuration file at path "' + configPath + '".';    
                        }
                    }
                    else {
                        throw 'Invalid Options. No dependencies provided.';    
                    }
                    
                }

                
                if (argv['package'] && !argv['name']) {
                    if (packageManifest.name) {
                        argv['name'] = packageManifest.name;
                    }
                }



                if (argv['url-prefix']) {
                    urlPrefix = argv['url-prefix'];
                }

                developmentMode = argv['development'];

                basePath = argv['base-path'];
            })
            .argv; 


        


        

        if (dependencies.length) {
            packageManifest = require('raptor-packaging').createPackageManifest({
                    dependencies: dependencies
                },
                resources.createFileResource(cwd));
        }


        if (!pageName && packageManifest) {
            if (packageManifest.name) {
                pageName = packageManifest.name;
            }
            else {
                var pageNameParts = [];
                packageManifest.raptor.forEachDependency(function(type, d) {
                    if (type === 'module') {
                        pageNameParts.push(d.name);
                    }
                    else if (type === 'package') {
                        var packageFile = new File(d.path);
                        var packageName = packageFile.getParentFile().getName();

                        if (d.path.endsWith("-package.json")) {
                            packageName += packageFile.getName().substring(0, packageFile.getName().lastIndexOf('-'));
                        }
                        pageNameParts.push(packageName);
                    }
                    else if (d.path) {
                        var file = new File(d.path);
                        pageNameParts.push(file.getName());
                    }
                });
                pageName = pageNameParts.join('_');
                pageName = pageName.replace(/[^A-Za-z0-9_\-\.]/g, '-');
            }
        }

        resources.addSearchPathDir(resolveFile(".").getAbsolutePath());
        var defaultModulesDir = resolveFile("raptor_modules");

        if (defaultModulesDir.exists()) {
            resources.addSearchPathDir(defaultModulesDir.getAbsolutePath());    
        }

        if (sourceDirs) {
            sourceDirs = sourceDirs.split(/[,;:]/);
            sourceDirs.forEach(function(sourceDir) {
                resources.addSearchPathDir(resolveFile(sourceDir).getAbsolutePath());
            });
        }

        var config = optimizer.getDefaultPageOptimizer().getConfig();

        if (minify) {
            logger.info("Enabled JavaScript and CSS minification");
            config.enableMinification();
        }

        if (urlPrefix || !configPath) {
            config.setUrlPrefix(urlPrefix || '');
        }

        if (includeChecksums || !configPath) {
            config.setChecksumsEnabled(includeChecksums);
        }
        
        if (outputDirPath || !configPath) {
            config.setOutputDir(outputDirPath || resolveFile("."));
            
        }

        if (developmentMode) {
            config.setInPlaceDeploymentEnabled(true);
        }

        if (basePath || developmentMode) {
            config.setBasePath(basePath || resolveFile("."));
        }
        

        optimizer.configure(config); //Reconfigure the optimizer

        var optimizerConfig = optimizer.getDefaultPageOptimizer().getConfig();


        var pagesToOptimize = [];
        if (packageManifest) {
            pagesToOptimize.push({
                name: pageName || 'unnamed',
                packageManifest: packageManifest,
                enabledExtensions: enabledExtensions
            });
        }
        else {
            
            optimizerConfig.forEachPageConfig(function(pageConfig) {
                var pageName = pageConfig.getName();
                var packageManifest = pageConfig.getPackageManifest();
                if (pageName && packageManifest) {
                    pagesToOptimize.push({
                        name: pageName,
                        packageManifest: packageManifest,
                        enabledExtensions: enabledExtensions
                    });
                }
            });

            if (pagesToOptimize.length === 0) {
                console.error('No pages found to optimize in "' + argv['config'] + '"');
                return;
            }

        }

        var outputDir = optimizerConfig.getOutputDir();

        function onError(e) {
            logger.error('Unable to optimize dependencies. Exception: ' + e, e);
        }

        var promises = [];

        pagesToOptimize.forEach(function(pageConfig) {
            logger.info('Optimizing bundle with name "' + pageConfig.name + '"...');

            var optimizedPagePromise = optimizer.optimizePage(pageConfig);
            optimizedPagePromise.then(
                function(optimizedPage) {
                    if (generateHtmlSlotsFile) {
                        var jsonOutputPath = new File(outputDir, pageConfig.name + "-html.json").getAbsolutePath();
                        logger.info('Writing HTML for optimized page to "' + jsonOutputPath + '"...');
                        var json = optimizedPage.toJSON();
                        var jsonFile = new File(jsonOutputPath);
                        jsonFile.writeAsString(json);    
                    }
                },
                onError);

            promises.push(optimizedPagePromise);
            
        });

        require('raptor-promises').all(promises)
            .then(
                function() {
                    console.log("Optimization successfully completed!");
                },
                onError);
    }
};