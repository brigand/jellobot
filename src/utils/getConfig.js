const fs = require('fs');

const filename = 'jellobot-config.json';
const absoluteFilePath = `${process.cwd()}/${filename}`;

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
    config.ircClientConfig = config.userName || config.nick;
    config.ircClientConfig.password = config.password;
    config.sasl = true;
  }

  // parse args
  const argv = process.argv.slice(2);
  config.verbose = argv.indexOf('-v') !== -1;

  return config;
};

exports.readAndProcessConfig = () => {
  let rawConfigFile;
  try {
    rawConfigFile = fs.readFileSync(filename, 'utf-8');
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
