const expect = require('chai').expect;

exports.check = function (lasso, helpers) {
    const myLasso1 = lasso.create({
        require: {
            test: 'abc'
        }
    });

    const myLasso2 = lasso.create({

    });

    const defaultLasso = lasso.getDefaultLasso();
    const requirePlugin1 = myLasso1.getConfig().getPlugins()[0];
    const requirePlugin2 = myLasso2.getConfig().getPlugins()[0];
    const requirePlugin3 = defaultLasso.getConfig().getPlugins()[0];

    expect(requirePlugin1.config.test).to.equal('abc');
    expect(requirePlugin2.config.test).to.not.exist;
    expect(requirePlugin3.config.test).to.not.exist;
};
