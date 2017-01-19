const fs = require('fs');
const path = require('path');
const parseJsfiddle = require('../parseJsfiddle');

it('parses', () => {
  const fixtureHtml = fs.readFileSync(path.join(__dirname, '../jsfiddle-example.html'), 'utf-8');
  const res = parseJsfiddle(fixtureHtml);
  expect(res).toEqual({
    js: `var a = {test: 'js'};`,
    html: `<b>test html</b>`,
    css: `.test-css {}`,
  });
});
