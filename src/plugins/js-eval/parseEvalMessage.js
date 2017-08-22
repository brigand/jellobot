const parseEvalMessage = (str) => {
  const opts = {};
  const type = str[0];

  if (type === 'n') {
    opts.engine = 'node';
  } else if (type === 'b') {
    opts.engine = 'babel';
  } else {
    return null;
  }

  const optsMatch = str.match(/^[nb](.*?)>/);
  if (!optsMatch) return null;
  const optsParts = (optsMatch[1] || '').split(/\s*,\s*/).filter(Boolean);
  optsParts.forEach((part) => {
    const split = part.split('=');
    if (split[0] === 'engine') return;

    if (split[1] == null) {
      opts[split[0]] = true;
    } else {
      opts[split[0]] = split[1];
    }
  });
  const rest = str.match(/^.*?>(.+)$/);
  if (!rest) {
    console.error(`Failed to match ${str} for js-eval`);
    return null;
  }
  const code = rest[1];
  return Object.assign({}, opts, { code });
};


module.exports = parseEvalMessage;
