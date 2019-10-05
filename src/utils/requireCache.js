const fs = require('fs');

function clearCache(test = null) {
  // clear the cache so we don't need to restart the bot
  Object.keys(require.cache).forEach((key) => {
    if (/node_modules/.test(key)) return;
    if (test) {
      if (typeof test === 'function' && !test(key)) return;
      if (test instanceof RegExp && !test.test(key)) return;
    }
    const item = require.cache[key];
    if (item.parent) {
      item.parent.children.splice(0);
    }
    delete require.cache[key];
  });
}

const isProd = process.env.NODE_ENV === 'production';

let needsUpdate = false;

if (isProd) {
  let last = new Date().toISOString();
  setInterval(() => {
    fs.readFile('/tmp/jellobot-updated-at', (err, res) => {
      if (err) {
        return;
      }
      const time = String(res).trim();

      if (last !== time) {
        last = time;
        needsUpdate = true;
      }
    });
  }, 1000);
}

function maybeClearCache(test) {
  if (isProd && !needsUpdate) {
    return;
  }
  needsUpdate = false;

  if (!isProd) {
    clearCache(test);
    return;
  }

  clearCache();
}

exports.clearCache = clearCache;
exports.maybeClearCache = maybeClearCache;
