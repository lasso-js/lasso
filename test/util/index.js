var fs = require('fs');
var nodePath = require('path');
const vm = require('vm');

function rmdirRecursive(dir) {
    var filenames;

    try {
        filenames = fs.readdirSync(dir);
    } catch(e) {
        return;
    }

    filenames.forEach(function(filename) {
        var path = nodePath.join(dir, filename);

        if (fs.lstatSync(path).isDirectory()) {
            rmdirRecursive(path);
        } else {
            fs.unlinkSync(path);
        }
    });

    fs.rmdirSync(dir);
}



function sandboxLoad(lassoPageResult, modulesRuntimeGlobal) {
    var sandbox = {
    };

    sandbox.window = sandbox;

    var context = vm.createContext(sandbox);

    function loadScript(path) {
        var code = fs.readFileSync(path, {encoding: 'utf8'});
        var script = new vm.Script(code, {
            filename: path,
            displayErrors: true
        });

        script.runInContext(context);
    }

    var files = lassoPageResult.getOutputFilesWithInfo();
    files.forEach((file) => {
        if (file.contentType !== 'js' || file.async) {
            return;
        }

        var path = file.path;
        try {
            loadScript(path);
        } catch (err) {
            console.error(`Error loading file ${JSON.stringify(file)}`, err);
            throw err;
        }
    });

    modulesRuntimeGlobal = modulesRuntimeGlobal || '$_mod';

    vm.runInContext(`window.${modulesRuntimeGlobal} && ${modulesRuntimeGlobal}.ready()`, context);

    sandbox.$loadScript = sandbox.window.$loadScript = loadScript;
    sandbox.console = sandbox.window.console = console;

    return sandbox;
}



function writeTestHtmlPage(lassoPageResult, outputFile) {
    var headHtml = lassoPageResult.getHeadHtml();
    var bodyHtml = lassoPageResult.getBodyHtml();

    var htmlSrc = '<html><head><title>Test Page</title>' +
        headHtml +
        '</head><body>' +
        bodyHtml +
        '</body></html>';

    fs.writeFileSync(outputFile, htmlSrc, { encoding: 'utf8' });
}

exports.rmdirRecursive = rmdirRecursive;
exports.sandboxLoad = sandboxLoad;
exports.writeTestHtmlPage = writeTestHtmlPage;
