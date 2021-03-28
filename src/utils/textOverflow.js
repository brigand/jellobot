const GraphemeSplitter = require('grapheme-splitter');

const overflow = (string, maxLength, suffixStr) => {
  const suffix = Buffer.from(suffixStr);

  const chunks = [];
  let remaining = maxLength;

  const splitter = new GraphemeSplitter();
  for (const grapheme of splitter.iterateGraphemes(string)) {
    const chunk = Buffer.from(grapheme, 'utf8');
    const next = remaining - chunk.length;

    if (next < 0) {
      while (chunks.length && remaining < suffix.length) {
        remaining += chunks.pop().length;
      }

      chunks.push(suffix);

      break;
    }

    chunks.push(chunk);
    remaining = next;
  }

  return Buffer.concat(chunks);
};

const ellipses = (string, maxLength) => overflow(string, maxLength, ' …');

module.exports = {
  overflow,
  ellipses,
};
