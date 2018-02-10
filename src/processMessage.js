const chalk = require('chalk');
const {safeDump: yamlStringify} = require('js-yaml');

function processMessage(client, config, logs, from, to, message) {
  // 'to' is either a channel, or the bot's nick. Later we set it to
  // the 'from' user if it's a PM
  let replyTo = to;

  // mentionUser will be replied to in respondWithMention
  // we change it later if the command ends with "@ somenick"
  let mentionUser = from;

  const messageObj = {
    from,
    message,
    rawMessage: message,
    config,
  };

  const say = (to2, raw) => {
    let text = String(raw).split('\n').join(' ');
    if (text.length > 400) {
      text = `${text.slice(0, 390)} ...`;
    }
    client.say(to2, text);
    console.log(`${chalk.green(to2)} ${text}`);
  };

  messageObj.sayTo = say;
  messageObj.respond = (text) => {
    say(replyTo, text);
  };
  messageObj.respondWithMention = (text) => {
    say(replyTo, `${mentionUser}, ${text}`);
  };

  if (to && to[0] !== '#') {
    messageObj.pm = true;
    replyTo = from;
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

  // parse e.g. !mdn array.map @ someuser
  // we only accept valid IRC nicks
  // https://stackoverflow.com/a/5163309/1074592
  const targetedMatch = messageObj.command
    && messageObj.command.command.match(/^(.*)@\s*([a-z_\-[\]\\^{}|`][a-z0-9_\-[\]\\^{}|`]{0,15})\s*$/i);
  const targetedMatch2 = messageObj.message.match(/^(.*)@\s*([a-z_\-[\]\\^{}|`][a-z0-9_\-[\]\\^{}|`]{0,15})\s*$/i);

  if (targetedMatch) {
    messageObj.command.command = targetedMatch[1].trim();
  }
  // Handles non-command messages, e.g. n> 1 + 1
  if (targetedMatch2) {
    messageObj.message = targetedMatch2[1].trim();
    mentionUser = targetedMatch2[2].trim();
    messageObj.mentionUser = mentionUser;
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
  // eslint-disable-next-line
  if (!logs[to]) logs[to] = [];
  logs[to].unshift(messageObj);
  if (logs[to].length > 500) logs[to].pop();

  messageObj.logs = logs[to];

  // in the actual plugin, omit the first argument
  messageObj.handling = (pluginName, extraInfo) => {
    let log = '';
    log += `${chalk.red(to)}`;
    log += ` ${chalk.yellow(from)}`;
    log += ` ${chalk.blue(pluginName)}`;
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

  return messageObj;
}

module.exports = processMessage;
