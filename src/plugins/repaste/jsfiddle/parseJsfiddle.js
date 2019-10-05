const cheerio = require('cheerio');

module.exports = function parseJsfiddle(rawHtml) {
  const $ = cheerio.load(rawHtml);
  const css = $('textarea#id_code_css')
    .text()
    .trim();
  const js = $('textarea#id_code_js')
    .text()
    .trim();
  const html = $('textarea#id_code_html')
    .text()
    .trim();
  return { js, css, html };
};
