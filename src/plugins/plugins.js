/* eslint global-require: "off" */
const get = require('lodash/get');
const { RespondWithMention, Respond } = require('../errors');
const { maybeClearCache } = require('../utils/requireCache');

const runPlugins = (msg) => {
  maybeClearCache(null);

  const plugins = require('./getPlugins')();

  Object.keys(plugins).forEach((key) => {
    const msg2 = {
      ...msg,
      handling: (extraInfo) => msg.handling(key, extraInfo),
      log: (extraInfo) => msg.log(key, extraInfo),
      vlog: (extraInfo) => {
        if (msg.verbose) msg.log(`${key}.verbose`, extraInfo);
      },
      selfConfig: get(msg, ['config', 'plugins', key]) || {},
    };
    try {
      const maybePromise = plugins[key](msg2);
      if (maybePromise && maybePromise.catch) {
        maybePromise.catch((e) => {
          if (RespondWithMention.is(e)) {
            msg.respondWithMention(e.original);
          } else if (Respond.is(e)) {
            msg.respond(e.original);
          } else {
            msg.respond(`An internal error occurred: ${e.message || e}`);

            if (e.stack) {
              console.error(
                `Error for msg=${JSON.stringify(msg.message)},from=${JSON.stringify(
                  msg.from,
                )}:`,
                e.stack,
              );
            }
          }
        });
      }
    } catch (e) {
      console.error(`Error while processing plugin "${key}"`);
      console.error(e);
      msg.respond(`An internal error occurred: ${e.message || e}`);
    }
  });
};

exports.run = runPlugins;
