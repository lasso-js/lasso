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

    var files = lassoPageResult.getJavaScriptFiles();
    files.forEach((file) => {
        var code = fs.readFileSync(file, {encoding: 'utf8'});
        var script = new vm.Script(code, {
            filename: file,
            displayErrors: true
        });

        script.runInContext(context);
    });

    modulesRuntimeGlobal = modulesRuntimeGlobal || '$_mod';

    vm.runInContext(`${modulesRuntimeGlobal}.ready()`, context);

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