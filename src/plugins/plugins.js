/* eslint global-require: "off" */
const runPlugins = (msg) => {
  // clear the cache so we don't need to restart the bot
  Object.keys(require.cache).forEach((key) => {
    if (/node_modules/.test(key)) return;
    const item = require.cache[key];
    item.parent.children.splice(0);
    delete require.cache[key];
  });

  const plugins = require('./getPlugins')();

  Object.keys(plugins).forEach((key) => {
    const msg2 = Object.assign({}, msg, {
      handling: extraInfo => msg.handling(key, extraInfo),
      log: extraInfo => msg.log(key, extraInfo),
      vlog: (extraInfo) => {
        if (msg.verbose) msg.log(`${key}.verbose`, extraInfo);
      },
    });
    try {
      const maybePromise = plugins[key](msg2);
      if (maybePromise && maybePromise.catch) {
        maybePromise.catch((e) => {
          msg.respond(`An async internal error occured: ${e.message || e}`);
          if (e.stack) {
            console.error(e.stack);
          }
        });
      }
    } catch (e) {
      console.error(`Error while processing plugin "${key}"`);
      console.error(e);
      msg.respond(`An internal error occured: ${e.message || e}`);
    }
  });
};

exports.run = runPlugins;
