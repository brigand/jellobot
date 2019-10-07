const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

let absoluteFilePath;

if (process.env.JELLOBOT_CONFIG) {
  absoluteFilePath = path.resolve(process.cwd(), process.env.JELLOBOT_CONFIG);
} else {
  const filename = 'jellobot-config.json';
  absoluteFilePath = `${process.cwd()}/${filename}`;
}

const defaultConfig = {
  commandPrefix: '!',
  server: 'chat.freenode.net',
  nick: `jellobot-${Math.floor(Math.random() * 1e5)}`,
  password: null,
  channels: [{ name: '##jellobot-test' }],
  plugins: {
    jsEval: {
      timeout: 5000,
    },
  },
};

exports.processConfig = (customConfig) => {
  const config = { ...defaultConfig, customConfig };

  // generate the config passed to new irc.Client
  config.ircClientConfig = {
    channels: config.channels.filter((x) => !x.requiresAuth).map(({ name }) => name),
    retryCount: 10,
  };

  if (config.password) {
    config.ircClientConfig.userName = config.userName || config.nick;
    config.ircClientConfig.password = config.password;
    // config.ircClientConfig.sasl = true;
  }

  // parse args
  const argv = process.argv.slice(2);
  config.verbose = config.verbose || argv.indexOf('-v') !== -1;

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
    customConfig = JSON5.parse(rawConfigFile);
  } catch (e) {
    console.error(e);
    console.error(`FATAL: ${absoluteFilePath} is invalid json`);
    process.exit(7);
  }

  return exports.processConfig(customConfig);
};
