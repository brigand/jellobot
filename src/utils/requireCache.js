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

const lastClearByTest = {};
const isProd = process.env.NODE_ENV === 'production';

let needsUpdate = false;

if (isProd) {
  process.on('SIGHUP', () => {
    needsUpdate = true;
  });
}

function maybeClearCache(test) {
  if (isProd && !needsUpdate) {
    return;
  }

  if (!isProd) {
    clearCache(test);
    return;
  }

  needsUpdate = false;
  clearCache();
}

exports.clearCache = clearCache;
exports.maybeClearCache = maybeClearCache;
