const pasteUrlToRaw = (url) => {
  const parts = url.split('/');
  if (!parts[parts.length - 1]) parts.pop();

  // https://bpaste.net/show/4463220a2c07 -> https://bpaste.net/raw/4463220a2c07
  if (/bpaste\.net\/show\//.test(url)) {
    return `https://bpaste.net/raw/${parts.pop()}`;
  }
  if (/bpaste\.net\/raw\//.test(url)) {
    return url;
  }

  // http://pastebin.com/iydu8g2t -> http://pastebin.com/raw/iYDU8g2T
  if (/pastebin\.com/.test(url)) {
    return `http://pastebin.com/raw/${parts.pop().toLowerCase()}`;
  }

  if (/dpaste\.com\//.test(url)) {
    if (/\.txt$/.test(url)) {
      return `http://dpaste.com/${parts.pop()}`;
    }
    return `http://dpaste.com/${parts.pop()}.txt`;
  }

  // https://codepen.io/brigand/pen/JERLwv -> https://codepen.io/brigand/pen/JERLwv.js
  if (/codepen\.io\/.*\/pen\/.+/.test(url)) {
    return `${url}.js`;
  }

  return null;
};

module.exports = pasteUrlToRaw;
