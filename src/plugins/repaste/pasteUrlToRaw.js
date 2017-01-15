const pasteUrlToRaw = (url) => {
  // https://bpaste.net/show/4463220a2c07 -> https://bpaste.net/raw/4463220a2c07
  if (/^https?:\/\/bpaste\.net\/show\//.test(url)) {
    const parts = url.split('/');
    if (!parts[parts.length - 1]) parts.pop();
    return `https://bpaste.net/raw/${parts.pop()}`;
  } else if (/^https?:\/\/bpaste\.net\/raw\//.test(url)) {
    return url;
  }

  return null;
};

module.exports = pasteUrlToRaw;
