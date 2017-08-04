var nodePath = require('path');

function create(config, lasso) {
    return {
        properties: {
            from: 'string',
            to: 'string',
            fromDirname: 'string'
        },

        init: function(lassoContext, callback) {
            var fromPath = this.resolvePath(this.from);
            var toPath = this.resolvePath(this.to);

            this.from = fromPath;
            this.to = toPath;
        },

        calculateKey: function() {
            return this.from + '|' + this.to;
        },

        getDir: function() {
            return nodePath.dirname(this.to);
        },

        getDependencies: function(lassoContext, callback) {
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
