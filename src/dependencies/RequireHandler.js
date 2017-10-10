var nodePath = require('path');
var ok = require('assert').ok;

var EMPTY_ARRAY_PROMISE = Promise.resolve([]);

class RequireHandler {
    constructor(userOptions, lassoContext, path) {
        ok(userOptions, '"userOptions" is required');
        ok(lassoContext, '"lassoContext" is required');
        ok(path, '"path" is required');

        this.lassoContext = lassoContext;
        this.userOptions = userOptions;
        this.path = path;
        this.includePathArg = true;

        this.userThisObject = {
            path: path,
            resolvePath: function(pathToResolve) {
                var dir = nodePath.dirname(path);
                var resolved = lassoContext.resolve(pathToResolve, dir);
                return resolved && resolved.path;
            }
        };
        this.lastModified = null;
        this.object = userOptions.object === true;
    }

    init() {
        var lassoContext = this.lassoContext;
        var userInit = this.userOptions.init;

        return new Promise((resolve, reject) => {
            if (userInit) {
                var promise = userInit.call(this.userThisObject, lassoContext, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });

                if (promise !== undefined) {
                    resolve(promise);
                }
            } else {
                resolve();
            }
        });
    }

    createReadStream() {
        var lassoContext = this.lassoContext;
        var path = this.path;
        var createReadStream = this.userOptions.createReadStream;
        if (createReadStream) {
            return this.includePathArg
                ? createReadStream.call(this.userThisObject, path, lassoContext)
                : createReadStream.call(this.userThisObject, lassoContext);
        }

        var userRead = this.userOptions.read;
        if (userRead) {
            return lassoContext.createReadStream((callback) => {
                return this.includePathArg
                    ? userRead.call(this.userThisObject, path, lassoContext, callback)
                    : userRead.call(this.userThisObject, lassoContext, callback);
            });
        } else {
            return lassoContext.createReadStream((callback) => {
                callback(null, '');
            });
        }
    }

    getLastModified() {
        var lassoContext = this.lassoContext;
        var path = this.path;
        var lastModifiedPromise = this.lastModified;

        if (lastModifiedPromise) {
            return lastModifiedPromise;
        }

        var userLastModified = this.userOptions.getLastModified;

        if (userLastModified) {
            this.lastModifiedPromise = new Promise((resolve, reject) => {
                let callback = (err, lastModified) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(lastModified || -1);
                    }
                };

                var userPromise = this.includePathArg
                    ? userLastModified.call(this.userThisObject, path, lassoContext, callback)
                    : userLastModified.call(this.userThisObject, lassoContext, callback);

                if (userPromise !== undefined) {
                    resolve(userPromise || -1);
                }
            });
        } else {
            this.lastModifiedPromise = this.lassoContext.getFileLastModified(path);
        }

        return this.lastModifiedPromise;
    }

    async getDependencies() {
        const lassoContext = this.lassoContext;
        const userGetDependencies = this.userOptions.getDependencies;
        if (!userGetDependencies) {
            return EMPTY_ARRAY_PROMISE;
        }

        return userGetDependencies.call(this.userThisObject, lassoContext);
    }

    getDefaultBundleName(pageBundleName, lassoContext) {
        var userGetDefaultBundleName = this.userOptions.getDefaultBundleName;
        if (userGetDefaultBundleName) {
            return userGetDefaultBundleName.call(this.userThisObject, pageBundleName, lassoContext);
        }
    }
}

module.exports = RequireHandler;
