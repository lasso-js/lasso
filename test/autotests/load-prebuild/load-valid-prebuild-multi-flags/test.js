const path = require('path');
const expect = require('chai').expect;

exports.check = async function (lasso) {
    const prebuildPath = path.join(__dirname, './page.prebuild.json');
    const lassoPageResult = await lasso.loadPrebuild({
        path: prebuildPath,
        flags: ['mobile', 'test']
    });
    expect(lassoPageResult.getHtmlForSlot('body')).to.equal('<script src=\"./test1.js\"></script>');
    expect(lassoPageResult.getHtmlForSlot('head')).to.equal('<link rel=\"stylesheet\" href=\"./style.css\">');
};
