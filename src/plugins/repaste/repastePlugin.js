const superagent = require('superagent');
const prettier = require('prettier');
const pasteUrlToRaw = require('./pasteUrlToRaw');
const createGist = require('./createGist');
const getJsfiddle = require('./jsfiddle/getJsfiddle');

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
        return {user: log.from, url: match};
      }
    }
  }
  return null;
};

const repastePlugin = (msg) => {
  if (!msg.command) return Promise.resolve();
  const words = msg.command.command.split(' ');
  if (words[0] !== 'repaste') return Promise.resolve();

  msg.handling();

  let url = null;
  let user = null;
  const specifiedUser = words[1];
  if (words[1]) {
    ({user, url} = findLinkInLogs(msg, specifiedUser));
  } else {
    ({user, url} = findLinkInLogs(msg));
  }

  if (url) {
    return getCode(msg, url).then((res) => { // eslint-disable-line no-use-before-define
      const jsSuffix = msg.to === '#reactjs' ? '.jsx' : '.js';
      const files = {
        [`code${jsSuffix}`]: res.js,
      };
      if (res.html) files['code.html'] = res.css;
      if (res.css) files['code.css'] = res.css;

      try {
        const formatted = prettier.format(res.js, {
          // printWidth: 100,
          singleQuote: true,
          trailingComma: true,
        });
        files[jsSuffix] = formatted;
      } catch (e) {
        console.error(e.message);
        // do nothing
      }

      createGist({
        files,
        tryShortUrl: true,
      })
      .then((gistUrl) => {
        msg.respondWithMention(`Repasted ${user}'s paste to ${gistUrl}`);
      })
      .catch((err) => {
        if (err && err.gistError) {
          msg.respondWithMention(`Failed to create gist. Possibly a rate limit`);
        } else {
          msg.respondWithMention(`Failed due to an unknown error. GreenJello, ping! ${err.message}`);
          console.error(err);
        }
      });
    }, (errorRes) => {
      msg.respondWithMention(`Failed to get raw paste data.`);
      if (errorRes) {
        msg.vlog(errorRes.text);
      } else {
        msg.vlog(`errorRes: ${errorRes}`);
      }
    });
  } else if (user) {
    msg.respondWithMention(`I couldn't find a link from ${user}`);
  } else {
    msg.respondWithMention(`I couldn't find a link in the past 500 messages. Maybe I was restarted recently.`);
  }

  return Promise.resolve();
};

function getCode(msg, url) {
  if (/jsfiddle\.net/.test(url)) {
    return getJsfiddle(url);
  }

  const rawFiles = pasteUrlToRaw(url);
  if (!rawFiles) {
    msg.respondWithMention(`I don't know the paste service at "${url}". GreenJello, ping!`);
    return Promise.reject();
  }
  msg.vlog(`Fetching ${rawFiles.js}, ${rawFiles.css}, ${rawFiles.html}`);
  const filePromises = Object.keys(rawFiles).map((extension) => {
    console.log({extension, url: rawFiles[extension]});
    return superagent.get(rawFiles[extension])
    .then((res) => {
      const {text} = res;
      msg.vlog(`Fetched ${rawFiles[extension]} with body length ${text.length}`);
      return {extension, text};
    });
  });

  return Promise.all(filePromises).then((results) => {
    return results.reduce((acc, {extension, text}) =>
      Object.assign({}, acc, {[extension]: text})
    , {});
  });
}

module.exports = repastePlugin;
