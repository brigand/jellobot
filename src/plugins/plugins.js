/* eslint global-require: "off" */
const runPlugins = (msg) => {
  // clear the cache so we don't need to restart the bot
  Object.keys(require.cache).forEach((key) => {
    delete require.cache[key];
  });

  const plugins = {
    repaste: require('./repaste/repastePlugin'),
  };

  Object.keys(plugins).forEach((key) => {
    const msg2 = Object.assign({}, msg, {
      handling: extraInfo => msg.handling(key, extraInfo),
      log: extraInfo => msg.log(key, extraInfo),
    });
    plugins[key](msg2);
  });
};

exports.run = runPlugins;
