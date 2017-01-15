const superagent = require('superagent');
const pasteUrlToRaw = require('./pasteUrlToRaw');
const createGist = require('./createGist');

const matchUrl = (text) => {
  const match = text.match(/(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/); // eslint-disable-line
  if (match) return match[0];
  return match;
};

const findLinkInLogs = (msg, user) => {
  for (let i = 0; i < msg.logs.length; i += 1) {
    const log = msg.logs[i];
    if (!user || log.from === user) {
      const match = matchUrl(log.message);
      if (match) {
        return match;
      }
    }
  }
  return null;
};

const repastePlugin = (msg) => {
  if (!msg.command) return;
  const words = msg.command.command.split(' ');
  if (words[0] !== 'repaste') return;

  msg.handling();

  let url = null;
  const user = words[1];
  if (words[1]) {
    url = findLinkInLogs(msg, user);
  } else {
    url = findLinkInLogs(msg);
  }

  if (url) {
    const rawUrl = pasteUrlToRaw(url);
    if (!rawUrl) {
      msg.respondWithMention(`I don't know the paste service at "${url}". GreenJello, ping!`);
      return;
    }
    msg.respondWithMention(rawUrl);
    msg.vlog(`Fetching ${rawUrl}`);
    superagent.get(rawUrl)
      .then((res) => {
        const {text} = res;
        msg.vlog(`Fetched ${rawUrl} with body length ${text.length}`);
        if (!text) {
          return;
        }
        createGist({
          files: {
            '.js': text,
          },
          tryShortUrl: true,
        })
        .then((gistUrl) => {
          msg.respondWithMention(`Repasted ${url} to ${gistUrl}`);
        })
        .catch((err) => {
          if (err && err.gistError) {
            msg.respondWithMention(`Failed to create gist. Possibly a rate limit`);
          } else {
            msg.respondWithMention(`Failed due to an unknown error. GreenJello, ping! ${err.message}`);
            console.error(err);
          }
        });
      });
  } else if (user) {
    msg.respondWithMention(`I couldn't find a link from ${user}`);
  } else {
    msg.respondWithMention(`I couldn't find a link in the past 500 messages. Maybe I was restarted recently.`);
  }
};

module.exports = repastePlugin;
