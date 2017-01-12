const irc = require('irc');
const {readAndProcessConfig} = require('./utils/getConfig');
const plugins = require('./plugins/plugins.js');

const config = readAndProcessConfig();

const client = new irc.Client(config.server, config.nick, config.ircClientConfig);

client.addListener('message', (from, to, message) => {
  const messageObj = {
    from,
    message,
    config,
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
  }

  if (config.verbose) {
    console.error(messageObj);
  }

  plugins.forEach((plugin) => {
    plugin(messageObj);
  });
});

client.addListener('error', (message) => {
  console.error(`Error event: ${message}`);
});

const connectStartTime = Date.now();
client.addListener('registered', () => {
  const connectFinishTime = Date.now();
  const diff = connectFinishTime - connectStartTime;
  console.log(`Connected to ${config.server} as ${config.nick}`);
  console.log(`Took ${diff}ms to connect.`);
});

if (config.verbose) {
  console.error('Running in verbose mode');
}
