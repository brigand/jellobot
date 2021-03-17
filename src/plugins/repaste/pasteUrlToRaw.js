const cheerio = require('cheerio');

const pasteUrlToRaw = (url) => {
  const parts = url.split('/');
  if (!parts[parts.length - 1]) parts.pop();

  // https://bpaste.net/show/4463220a2c07 -> https://bpaste.net/raw/4463220a2c07
  if (/bpaste\.net\/show\//.test(url)) {
    return { js: `https://bpaste.net/raw/${parts.pop()}` };
  }
  if (/bpa\.st\/./.test(url)) {
    return { js: url.replace('bpa.st/', 'bpa.st/raw/') };
  }
  if (/bpaste\.net\/raw\//.test(url)) {
    return { js: url };
  }

  // http://pastebin.com/iydu8g2t -> http://pastebin.com/raw/iYDU8g2T
  if (/pastebin\.com/.test(url)) {
    return { js: `https://pastebin.com/raw/${parts.pop()}` };
  }

  if (/dpaste\.com\//.test(url)) {
    if (/\.txt$/.test(url)) {
      return { js: `http://dpaste.com/${parts.pop()}` };
    }
    return { js: `http://dpaste.com/${parts.pop()}.txt` };
  }

  if (/dpaste.org/.test(url)) {
    return {
      js: {
        url,
        transform(html) {
          const $ = cheerio.load(html);
          const $code = $('textarea#id_content');
          if (!$code.length) {
            return null;
          }
          return $code.text();
        },
      },
    };
  }

  if (/dpaste\.de/.test(url)) {
    if (/raw$/.test(url)) {
      return { js: url };
    }

    return { js: `${url}/raw` };
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
