const nodePath = require('path');

function create(config, lasso) {
    return {
        properties: {
            from: 'string',
            to: 'string',
            fromDirname: 'string'
        },

        async init (lassoContext) {
            const fromPath = this.resolvePath(this.from);
            const toPath = this.resolvePath(this.to);

            this.from = fromPath;
            this.to = toPath;
        },

        calculateKey () {
            return this.from + '|' + this.to;
        },

        getDir: function() {
            return nodePath.dirname(this.to);
        },

        async getDependencies (lassoContext) {
            return [
                {
                    type: 'commonjs-remap',
                    from: this.from,
                    to: this.to
                }
            ];
        }
    };
}

exports.create = create;
