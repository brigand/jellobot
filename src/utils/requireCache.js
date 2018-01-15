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
const delay = isProd ? 5000 : 0;

function maybeClearCache(test) {
  if (!isProd) {
    clearCache(test);
    return;
  }

  const testStr = String(test);
  const last = lastClearByTest[testStr] || 0;

  if (Date.now() > last + delay) {
    lastClearByTest[testStr] = Date.now();
    clearCache();
  }
}

exports.clearCache = clearCache;
exports.maybeClearCache = maybeClearCache;
