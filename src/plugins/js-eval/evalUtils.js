const crypto = require('crypto');

const names = {
  make: () => `jseval-${crypto.randomBytes(8).toString('hex')}`,
  test: (str) => /^jseval-[a-f0-9]+$/i.test(str),
};

exports.names = names;
