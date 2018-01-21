const babylon = require('babylon');

const parseCode = (code) => {
  const ast = babylon.parse(code, {
    sourceType: 'script',
    ranges: true,
    plugins: [
      'objectRestSpread',
    ],
  });

  return ast;
};

module.exports = parseCode;
