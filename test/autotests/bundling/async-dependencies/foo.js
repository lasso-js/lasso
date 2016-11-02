console.log('foo');

require('lasso-loader').async([
    './a.js',
    './b.js'
], function(err) {
    require('./foo-async');
});