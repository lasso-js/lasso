const path = require('path');
const expect = require('chai').expect;

const prebuildPath = path.join(__dirname, './page.prebuild.json');

exports.check = async function (lasso) {
    const lassoPageResult = await lasso.loadPrebuild({
        path: prebuildPath,
        flags: ['mobile']
    });
    expect(lassoPageResult.getHtmlForSlot('body')).to.equal('<script src=\"./test.js\"></script>');
    expect(lassoPageResult.getHtmlForSlot('head')).to.equal('<link rel=\"stylesheet\" href=\"./style.css\">');
};

exports.checkError = function (err) {
    expect(err.message).to.contain(`Error loading prebuild. No prebuild with path "${prebuildPath}" exists.`);
};
