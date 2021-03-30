const irc = require('irc');
const chalk = require('chalk');
const { maybeClearCache } = require('./utils/requireCache');
const init = require('./plugins/initPlugins');

chalk.enabled = true;

const { readAndProcessConfig } = require('./utils/getConfig');
const plugins = require('./plugins/plugins.js');
const changeNick = require('./utils/changeNick');

const logBotPrefix = chalk.black.bgYellow('BOT');

let config = readAndProcessConfig();

init().catch((e) => {
  console.error(`init failed. This is potentially unsafe, but we'll continue.`);
  console.error(e);
});

const client = new irc.Client(config.server, config.nick, config.ircClientConfig);
client.currentNick = config.nick;
client.currentPrefix = '';

function updateConfig() {
  const newConfig = readAndProcessConfig();
  if (!config) {
    config = newConfig;
    return;
  }

  // Cache these before we update the 'config' variable
  const oldChan = config.channels;
  const newChan = newConfig.channels;
  const oldNick = config.nick;
  const newNick = newConfig.nick;

  // Replace the config, which is passed around
  config = newConfig;

  // join channels
  for (const chan of newChan) {
    if (!oldChan.find((x) => x.name === chan.name)) {
      client.join(chan.name);
    }
  }
  for (const chan of oldChan) {
    if (!newChan.find((x) => x.name === chan.name)) {
      client.part(chan.name);
    }
  }

  if (oldNick !== newNick) {
    changeNick(client, config.nick, false);
  }
}

setInterval(updateConfig, 3000);

// mutable list of recent messages per channel
// newest messages first
const logs = {};

let lastProcessMessageFail = 0;

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
    if (Date.now() > lastProcessMessageFail + 1000 * 60 * 60) {
      lastProcessMessageFail = Date.now();
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
        .filter((x) => x.requiresAuth)
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

if (config.verbose) {
  console.log(`${logBotPrefix}: ${chalk.yellow(`Running in verbose mode.`)}`);
}
