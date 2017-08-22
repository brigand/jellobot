const fs = require('fs');
const path = require('path');

let absoluteFilePath;

if (process.env.JELLOBOT_CONFIG) {
  absoluteFilePath = path.resolve(process.cwd(), process.env.JELLOBOT_CONFIG);
} else {
  const filename = 'jellobot-config.json';
  absoluteFilePath = `${process.cwd()}/${filename}`;
}

const defaultConfig = {
  commandPrefix: '!',
  server: 'irc.freenode.net',
  nick: `jellobot-${Math.floor(Math.random() * 1e5)}`,
  password: null,
  channels: [
    {name: '##jellobot-test'},
  ],
  plugins: {},
};

exports.processConfig = (customConfig) => {
  const config = Object.assign({}, defaultConfig, customConfig);

  // generate the config passed to new irc.Client
  config.ircClientConfig = {
    channels: config.channels.map(({name}) => name),
    retryCount: 10,
  };

  if (config.password) {
    config.ircClientConfig.userName = config.userName || config.nick;
    config.ircClientConfig.password = config.password;
    config.ircClientConfig.sasl = true;
  }

  // parse args
  const argv = process.argv.slice(2);
  config.verbose = argv.indexOf('-v') !== -1;

  return config;
};

exports.readAndProcessConfig = () => {
  let rawConfigFile;
  try {
    rawConfigFile = fs.readFileSync(absoluteFilePath, 'utf-8');
  } catch (e) {
    console.error(`FATAL: Couldn't read ${absoluteFilePath}`);
    process.exit(7);
  }

  let customConfig;
  try {
    customConfig = JSON.parse(rawConfigFile);
  } catch (e) {
    console.error(e);
    console.error(`FATAL: ${absoluteFilePath} is invalid json`);
    process.exit(7);
  }

  return exports.processConfig(customConfig);
};
