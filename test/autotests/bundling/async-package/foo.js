console.log('foo');

require('lasso-loader').async('foo-async-package', function(err) {
    require('./foo-async');
});