module.exports = function create(__helpers) {
  var empty = __helpers.e,
      notEmpty = __helpers.ne,
      taglib_page_tag = require("../../../../../taglib/page-tag"),
      taglib_head_tag = require("../../../../../taglib/head-tag"),
      taglib_body_tag = require("../../../../../taglib/body-tag");

  return function render(data, context) {
    __helpers.t(context, 
      taglib_page_tag,
      {
        "name": "page1",
        "packagePath": "./optimizer.json",
        "dirname": __dirname
      });

    context.w('<html><head>');
    __helpers.t(context, 
      taglib_head_tag,
      {});

    context.w('</head><body>');
    __helpers.t(context, 
      taglib_body_tag,
      {});

    context.w('</body></html>');
  };
}