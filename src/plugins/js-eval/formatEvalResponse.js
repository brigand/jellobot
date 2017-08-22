/* eslint no-continue: 0 */
const formatEvalResponse = (text) => {
  const lines = text.split('\n');
  const resLines = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const line of lines) {
    const tline = line.trim();
    // console.log(`tline`, tline);
    if (!tline) {
      continue;
    }
    if (tline.indexOf('at') === 0) {
      if (tline.indexOf('/var/ws/eval-js.js') !== -1) {
        continue;
      }
      if (tline.indexOf('(module.js:') !== -1) {
        continue;
      }
      if (tline.indexOf('(bootstrap_node.js:') !== -1) {
        continue;
      }
    }
    resLines.push(tline);
  }
  return resLines.join(' ');
};

module.exports = formatEvalResponse;
