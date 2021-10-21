const irc = require('irc-upd');
const chalk = require('chalk');
const { maybeClearCache } = require('./utils/requireCache');
const init = require('./plugins/initPlugins');

chalk.enabled = true;

const { readAndProcessConfig } = require('./utils/getConfig');
const plugins = require('./plugins/plugins.js');
const changeNick = require('./utils/changeNick');

const logBotPrefix = chalk.black.bgYellow('BOT');

let globalConfig = readAndProcessConfig();

init().catch((e) => {
  console.error(`init failed. This is potentially unsafe, but we'll continue.`);
  console.error(e);
});

const clients = globalConfig.servers.map((server, index) => {
  const client = new irc.Client(server.server, server.nick, server.ircClientConfig);

  client.clientIndex = index;
  client.clientHost = server.server;
  client.currentNick = server.nick;
  client.currentPrefix = '';
  client.serverConfig = server;

  return client;
});

function updateConfig() {
  const newConfig = readAndProcessConfig();
  if (!globalConfig) {
    globalConfig = newConfig;
    return;
  }

  const oldConfig = globalConfig;
  // Replace the config, which is passed around
  globalConfig = newConfig;

  for (const server of newConfig.servers) {
    const prevServer = oldConfig.servers.find((old) => old.server === server.server);
    const client = clients.find((client) => client.clientHost === server.server);
    if (prevServer && client) {
      client.serverConfig = server;

      // Cache these before we update the 'config' variable
      const oldChan = prevServer.channels;
      const newChan = server.channels;
      const oldNick = prevServer.nick;
      const newNick = server.nick;

      // join channels
      for (const chan of newChan) {
        if (!oldChan.find((x) => x.name === chan.name)) {
          client.join(chan.name);
        }
      }
      for (const chan of oldChan) {
        if (chan.name && !newChan.find((x) => x.name === chan.name)) {
          client.part(chan.name);
        }
      }

      if (oldNick !== newNick) {
        changeNick(client, newNick, false);
      }
    }
  }
}

setInterval(updateConfig, 3000);

clients.forEach((client) => {
  /* eslint-disable no-param-reassign */

  const config = client.serverConfig;

  // mutable per-server list of recent per-channel messages
  // newest messages first
  let lastProcessMessageFail = 0;
  const logs = {};

  client.addListener('message', (from, to, message) => {
    if (from === config.nick) return;

    maybeClearCache(/processMessage/);

    let messageObj;
    try {
      // eslint-disable-next-line global-require
      const processMessage = require('./processMessage');
      messageObj = processMessage(client, config, logs, from, to, message);
    } catch (e) {
      const isRoom = /^#/.test(to);
      const now = Date.now();
      if (now > lastProcessMessageFail + 1000 * 60 * 60) {
        lastProcessMessageFail = now;
        client.say(isRoom ? to : from, `Internal error while processing the message`);
      }
      return;
    }

    plugins.run(messageObj);
  });

  client.addListener('join', (channel, nick, message) => {
    if (nick === client.currentNick) {
      if (message.prefix) {
        client.currentPrefix = message.prefix;
      }
    }
  });

  let didRegister = false;

  client.addListener('raw', (message) => {
    if (message.command === 'NICK' && message.nick === config.nick) {
      const changedTo = message.args[0];

      client.currentNick = changedTo;

      if (changedTo === config.nick) {
        return;
      }

      if (!didRegister) return;

      setTimeout(() => {
        changeNick(client, config.nick, true);
      }, 60e3 * 5);
    }
  });

  client.addListener('error', (message) => {
    console.error(`${chalk.red('IRC Error')}:`, message);
  });

  const connectStartTime = Date.now();
  let connectFinishTime;
  client.addListener('registered', () => {
    connectFinishTime = Date.now();
    const diff = connectFinishTime - connectStartTime;
    console.log(`${logBotPrefix}: connected to ${config.server} as ${config.nick}.`);
    console.log(`${logBotPrefix}: took ${diff}ms to connect.`);

    setTimeout(() => {
      didRegister = true;
    }, 500);

    if (config.password) {
      client.say('nickserv', `IDENTIFY ${config.userName} ${config.password}`);
      setTimeout(() => {
        config.channels
          .filter((x) => x.requiresAuth && x.name)
          .forEach((c) => {
            client.join(c.name);
          });

        client.say('nickserv', `regain ${config.nick}`);
      }, 1000);
    }
  });
  console.log(`${logBotPrefix}: Connecting to ${config.server} as ${config.nick}`);

  const receivedNickListsForChannelEver = {};
  client.addListener('names', (channel, nicks) => {
    if (receivedNickListsForChannelEver[channel]) {
      return;
    }
    receivedNickListsForChannelEver[channel] = true;
    const diffFromConnect = Date.now() - connectFinishTime;
    console.log(
      `${logBotPrefix}: connected to ${channel} which has ${
        Object.keys(nicks).length
      } users. Took ${diffFromConnect}ms since register.`,
    );
  });
});

if (globalConfig.verbose) {
  console.log(`${logBotPrefix}: ${chalk.yellow(`Running in verbose mode.`)}`);
}
