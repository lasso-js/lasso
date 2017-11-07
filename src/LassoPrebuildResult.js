const promisify = require('pify');
const fs = require('fs');
const writeFileAsync = promisify(fs.writeFile);

/**
* We may want to store the prebuild in the same directory as the page
* file instead of the current working directory. There will often be
* an npm script that is running at the base of the project. In the
* AWS Lambda case, we want the prebuild file to live alongside of the
* page itself. We need to preprocess all of the builds and then write
* them individually after because there may be multiple pages that live
* in the same directory as well as multiple builds for the same page
* with different flags.
*/
class LassoPrebuildResult {
    constructor () {
        this._buildsByPath = {};
    }

    addBuild (path, build) {
        if (this._buildsByPath[path]) {
            this._buildsByPath[path].push(build);
        } else {
            this._buildsByPath[path] = [build];
        }
    }

    async write () {
        for (const buildPath in this._buildsByPath) {
            await writeFileAsync(
                buildPath,
                this.serializeBuild(buildPath),
                'utf8');
        }
    }

    serializeBuild (path) {
        const build = this._buildsByPath[path];
        return JSON.stringify(build, null, 2);
    }

    getBuildByPath (path) {
        return this._buildsByPath[path];
    }

    getBuildsByPath () {
        return this._buildsByPath;
    }
}

module.exports = LassoPrebuildResult;
