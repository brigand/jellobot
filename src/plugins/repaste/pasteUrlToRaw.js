const pasteUrlToRaw = (url) => {
  const parts = url.split('/');
  if (!parts[parts.length - 1]) parts.pop();

  // https://bpaste.net/show/4463220a2c07 -> https://bpaste.net/raw/4463220a2c07
  if (/bpaste\.net\/show\//.test(url)) {
    return { js: `https://bpaste.net/raw/${parts.pop()}` };
  }
  if (/bpaste\.net\/raw\//.test(url)) {
    return { js: url };
  }

  // http://pastebin.com/iydu8g2t -> http://pastebin.com/raw/iYDU8g2T
  if (/pastebin\.com/.test(url)) {
    return { js: `http://pastebin.com/raw/${parts.pop().toLowerCase()}` };
  }

  if (/dpaste\.com\//.test(url)) {
    if (/\.txt$/.test(url)) {
      return { js: `http://dpaste.com/${parts.pop()}` };
    }
    return { js: `http://dpaste.com/${parts.pop()}.txt` };
  }

  if (/dpaste\.de/.test(url)) {
    if (/raw$/.test(url)) {
      return { js: url };
    } else {
      return { js: `${url}/raw` };
    }
  }

  // https://codepen.io/brigand/pen/JERLwv -> https://codepen.io/brigand/pen/JERLwv.js
  if (/codepen\.io\/.*\/pen\/.+/.test(url)) {
    return {
      js: `${url}.js`,
      css: `${url}.css`,
      html: `${url}.html`,
    };
  }

  if (/sprunge\.us/.test(url)) {
    return { js: url.replace(/\?.*$/g, '') };
  }

  if (/hastebin\.com/.test(url)) {
    const match = url.match(/.*hastebin.com\/([^.]+)/);
    if (match) {
      return { js: `https://hastebin.com/raw/${match[1]}` };
    }
    return null;
  }

  return null;
};

module.exports = pasteUrlToRaw;
