var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        require: {
            lastSlot: 'body'
        }
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    {
                        type: 'require',
                        path: path.join(__dirname, 'head.js'),
                        run: true,
                        wait: false,
                        slot: 'head'
                    },
                    {
                        type: 'require',
                        path: path.join(__dirname, 'body.js'),
                        run: true,
                        wait: false
                    }
                ]
            },
            check(lassoPageResult, writerTracker) {
                var htmlBySlot = lassoPageResult.getHtmlBySlot();
                expect(htmlBySlot.head).to.equal('<script src="/static/bundling-modules-ready-lastSlot.js"></script>');
                expect(htmlBySlot.body).to.equal('<script src="/static/bundling-modules-ready-lastSlot.js"></script>\n<script>$_mod.ready();</script>');
            }
        }
    ];
};