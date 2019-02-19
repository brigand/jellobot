const superagent = require('superagent');
const prettier = require('prettier');
const pasteUrlToRaw = require('./pasteUrlToRaw');
const {createGist, deleteGist} = require('./createGist');
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
  return [];
};

const repastePlugin = (msg) => {
  if (!msg.command) return Promise.resolve();
  const words = msg.command.command.split(' ');
  if (words[0] === 'unpaste') {
    msg.handling();
    if (msg.config.githubToken) {
      return deleteGist({id: words[1], githubToken: msg.config.githubToken})
        .then(() => {
          msg.respondWithMention(`Deleted ${words[1]}`);
        })
        .catch((err) => {
          console.error('Failed to delete gist', err);
          msg.respondWithMention(`Failed to delete the gist. Message: "${err.message || 'unknown'}"`);
        });
    }

    msg.respondWithMention(`I'm not configured with a github token, so I can't delete the gist.`);
    return Promise.reject();
  }
  if (words[0] !== 'repaste') return Promise.resolve();

  msg.handling();

  let url = null;
  let user = null;
  const specifiedUser = words[1];
  if (/^https?:/.test(words[1])) {
    user = null;
    // eslint-disable-next-line
    url = words[1];
  } else if (words[1]) {
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
      if (res.html) files['code.html'] = res.html;
      if (res.css) files['code.css'] = res.css;

      try {
        const formatted = prettier.format(res.js, {
          // printWidth: 100,
          singleQuote: true,
          trailingComma: true,
          bracketSpacing: false,
        });
        files[jsSuffix] = formatted;
        delete files[`code${jsSuffix}`];
      } catch (e) {
        console.error(e.message);
        // do nothing
      }

      createGist({
        files,
        tryShortUrl: true,
        githubToken: msg.config.githubToken,
      })
      .then(({ url: resultUrl }) => {
        if (user) {
        msg.respondWithMention(`Repasted ${user}'s paste to ${resultUrl}`);
        } else {
          msg.respondWithMention(`Repasted ${url} to ${resultUrl}`);
        }
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
      if (errorRes && errorRes.type === 'InvalidUrl') {
        return;
      }
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
    return Promise.reject({type: 'InvalidUrl'});
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
