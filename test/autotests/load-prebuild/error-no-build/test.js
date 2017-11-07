const path = require('path');
const expect = require('chai').expect;

const prebuildPath = path.join(__dirname, './page.prebuild.json');

exports.check = async function (lasso) {
    const lassoPageResult = await lasso.loadPrebuild({ path: prebuildPath });

    expect(lassoPageResult.getHtmlForSlot('body')).to.equal('<script src=\"./test.js\"></script>');
    expect(lassoPageResult.getHtmlForSlot('head')).to.equal('<link rel=\"stylesheet\" href=\"./style.css\">');
};

exports.checkError = function (err) {
    expect(err.message).to.contain(`No build could be found using flags: "undefined" for file at path "${prebuildPath}"`);
};
