const imageSize = require('util').promisify(require('image-size'));
const nodePath = require('path');

const IMAGE_SIZE_WHITELIST = {
    '.png': true,
    '.jpeg': true,
    '.jpg': true,
    '.gif': true,
    '.webp': true
};

function plugin(lasso, config) {
    const handler = {
        properties: {
            path: 'string'
        },

        async init (lassoContext) {
            if (!this.path) {
                throw new Error('"path" is required for a Marko dependency');
            }

            this.path = this.resolvePath(this.path);
        },

        object: true, // We are exporting a simple JavaScript object

        read (lassoContext) {
            return new Promise((resolve, reject) => {
                plugin.getImageInfo(this.path, { lasso, lassoContext }, (err, imageInfo) => {
                    return err ? reject(err) : resolve(JSON.stringify(imageInfo));
                });
            });
        },

        async getLastModified(lassoContext) {
            return lassoContext.getFileLastModified(this.path);
        }
    };

    [
        'png',
        'jpeg',
        'jpg',
        'gif',
        'svg',
        'webp'
    ].forEach(function(ext) {
        lasso.dependencies.registerRequireType(ext, handler);
    });
};

plugin.getImageInfo = function(path, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    let theLasso;
    let lassoContext;
    let renderContext;

    if (options) {
        theLasso = options.lasso;
        lassoContext = options.lassoContext;
        renderContext = options.renderContext;
    }

    if (!theLasso) {
        theLasso = (plugin.lasso || require('../../../')).defaultLasso;
    }

    if (!lassoContext) {
        lassoContext = theLasso.createLassoContext(
            renderContext ? { data: { renderContext } } : {});
    }

    // NOTE: lassoContext.getFileLastModified caches file timestamps
    lassoContext.getFileLastModified(path)
        .then((lastModified) => {
            const cache = lassoContext.cache.getCache('lasso-image');
            return cache.get(path, {
                lastModified,
                async builder () {
                    const imageInfo = {};

                    const resourceInfo = await theLasso.lassoResource(path, lassoContext);
                    imageInfo.url = resourceInfo.url;

                    const ext = nodePath.extname(path);
                    if (IMAGE_SIZE_WHITELIST[ext]) {
                        const dimensions = await imageSize(path);
                        imageInfo.width = dimensions.width;
                        imageInfo.height = dimensions.height;
                    }

                    return imageInfo;
                }
            });
        }).then((imageInfo) => {
            callback(null, imageInfo);
        })
        .catch((err) => {
            callback(err);
        });
};

module.exports = plugin;
