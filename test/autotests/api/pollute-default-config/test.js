
var expect = require('chai').expect;

exports.check = function(lasso, helpers, done) {
    var myLasso1 = lasso.create({
        require: {
            test: 'abc'
        }
    });

    var myLasso2 = lasso.create({

    });

    var defaultLasso = lasso.getDefaultLasso();

    var requirePlugin1 = myLasso1.getConfig().getPlugins()[0];
    var requirePlugin2 = myLasso2.getConfig().getPlugins()[0];
    var requirePlugin3 = defaultLasso.getConfig().getPlugins()[0];

    expect(requirePlugin1.config.test).to.equal('abc');
    expect(requirePlugin2.config.test).to.not.exist;
    expect(requirePlugin3.config.test).to.not.exist;

    done();
};

