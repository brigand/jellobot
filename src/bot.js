const irc = require('irc');
const chalk = require('chalk');
const {safeDump: yamlStringify} = require('js-yaml');
const {readAndProcessConfig} = require('./utils/getConfig');
const plugins = require('./plugins/plugins.js');

const logBotPrefix = chalk.black.bgYellow('BOT');

const config = readAndProcessConfig();

const client = new irc.Client(config.server, config.nick, config.ircClientConfig);

// mutable list of recent messages per channel
// newest messages first
const logs = {};

client.addListener('message', (from, to, message) => {
  const messageObj = {
    from,
    message,
    config,
  };

  const say = (to2, raw) => {
    let text = String(raw).split('\n').join(' ');
    if (text.length > 500) {
      text = `${text.slice(0, 490)} ...`;
    }
    client.say(to2, text);
    console.log(`${chalk.bgGreen(to2)} ${text}`);
  };

  messageObj.sayTo = say;
  messageObj.respond = (text) => {
    say(text);
  };
  messageObj.respondWithMention = (text) => {
    say(to, `${from}, ${text}`);
  };

  if (to === config.nick) {
    messageObj.pm = true;
  } else {
    messageObj.pm = false;

    const channelConfig = config.channels.find((channel) => {
      return channel.name.toLowerCase() === to.toLowerCase();
    });

    if (channelConfig) {
      messageObj.channel = to;
      messageObj.channelConfig = channelConfig;
    }
  }

  if (message.indexOf(config.commandPrefix) === 0) {
    const command = message.slice(config.commandPrefix.length);
    messageObj.command = {
      prefix: config.commandPrefix,
      command,
    };
  } else if (messageObj.pm) {
    messageObj.command = {
      command: message,
    };
  }

  messageObj.verbose = !!config.verbose;
  if (config.verbose) {
    console.error(yamlStringify(messageObj, {
      skipInvalid: true,
      flowLevel: 2,
      noRefs: true,
    }).trim());
  }

  // log the message
  if (!logs[to]) logs[to] = [];
  logs[to].unshift(messageObj);
  if (logs[to].length > 500) logs[to].pop();

  messageObj.logs = logs[to];

  messageObj.handling = (pluginName, extraInfo) => {
    let log = '';
    log += `${chalk.bgRed(to)}`;
    log += ` ${chalk.bgYellow(from)}`;
    log += ` ${chalk.bgBlue(pluginName)}`;
    log += ` ${messageObj.message}`;
    console.log(log);
    if (extraInfo !== undefined) {
      console.log(extraInfo);
    }
  };
  messageObj.log = (pluginName, extraInfo) => {
    process.stderr.write(`${chalk.blue(pluginName)}: `);
    console.log(extraInfo);
  };

  plugins.run(messageObj);
});

client.addListener('error', (message) => {
  console.error(`${chalk.red('IRC Error')}: ${message}`);
});

const connectStartTime = Date.now();
let connectFinishTime;
client.addListener('registered', () => {
  connectFinishTime = Date.now();
  const diff = connectFinishTime - connectStartTime;
  console.log(`${logBotPrefix}: connected to ${config.server} as ${config.nick}.`);
  console.log(`${logBotPrefix}: took ${diff}ms to connect.`);
});
console.log(`${logBotPrefix}: Connecting to ${config.server} as ${config.nick}`);

const receivedNickListsForChannelEver = {};
client.addListener('names', (channel, nicks) => {
  if (receivedNickListsForChannelEver[channel]) {
    return;
  }
  receivedNickListsForChannelEver[channel] = true;
  const diffFromConnect = Date.now() - connectFinishTime;
  console.log(`${logBotPrefix}: connected to ${channel} which has ${Object.keys(nicks).length} users. Took ${diffFromConnect}ms since register.`);
});

if (config.verbose) {
  console.log(`${logBotPrefix}: ${chalk.yellow(`Running in verbose mode.`)}`);
}
