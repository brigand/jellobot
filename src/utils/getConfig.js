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

const randomNick = `jellobot-${Math.floor(Math.random() * 1e5)}`;
const defaultServer = {
  commandPrefix: '!',
  server: 'chat.freenode.net',
  nick: randomNick,
  password: null,
  channels: [{ name: '##jellobot-test' }],
};

const defaultConfig = {
  servers: [{ ...defaultServer }],

  plugins: {
    jsEval: {
      timeout: 5000,
    },
  },
};

const legacyConfigToMultiServer = (config) => {
  let { plugins, servers, ...rest } = config; // eslint-disable-line prefer-const

  if (!Array.isArray(servers)) {
    servers = [rest];
  }

  servers = servers.map((server) => ({
    ...defaultServer,
    ...server,
  }));

  return { plugins, servers };
};

exports.processConfig = (customConfig) => {
  const config = legacyConfigToMultiServer({ ...defaultConfig, ...customConfig });

  for (const server of config.servers) {
    // generate the config passed to new irc.Client
    server.ircClientConfig = {
      channels: server.channels
        .filter((x) => !x.requiresAuth)
        .map(({ name }) => name),
      retryCount: 10,
    };

    if (server.password) {
      server.ircClientConfig.userName = server.userName || server.nick;
      server.ircClientConfig.password = server.password;
      // server.ircClientConfig.sasl = true;
    }
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
