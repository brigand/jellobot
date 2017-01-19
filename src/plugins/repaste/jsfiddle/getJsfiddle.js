const superagent = require('superagent');
const parseJsfiddle = require('./parseJsfiddle');

module.exports = function getJsfiddle(url) {
  return superagent.get(url).then(res => parseJsfiddle(res.text));
};
