var packageId = 'foo';

console.log('main');
require('lasso-loader').async(packageId, function(err) {
    require('./foo');
});

var callback = function(err) {
    require('./bar');
};

require('lasso-loader').async('bar', callback);