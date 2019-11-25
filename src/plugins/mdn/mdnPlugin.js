const url = require('url');
const superagent = require('superagent');

const mdnUrl = 'https://developer.mozilla.org'
const mdnSearchApiUrl = `${mdnUrl}/api/v1/search/en-US`

class HtmlParseError extends Error {}

const mdnPlugin = async (msg) => {
  if (!msg.command) return;

  const words = msg.command.command.split(' ');
  if (words[0] !== 'mdn') {
    return;
  }
  msg.handling();

  const query = new URLSearchParams({ q: words.slice(1).join(' '), topic: 'js' });
  const initialUrl = `${mdnSearchApiUrl}?${query}`;

  let lastRedirect = initialUrl;
  let res = null;

  try {
    res = await superagent
      .get(initialUrl)
      .set('accept-language', 'en-US,en;q=0.5')
      .set('Accept', 'application/json')
      .redirects(5)
      .on('redirect', (redirect) => {
        lastRedirect = redirect.headers.location;
      });
  } catch (e) {
    // Rethrow if it's not an HTTP error
    if (!e || !e.response) {
      throw e;
    }
  }

  if (!res || !res.ok) {
    msg.respondWithMention(`Try ${initialUrl} (couldn't fetch metadata)`);
    return;
  }

  let pageData;
  try {
    pageData = {
      title: res.body.documents[0].title,
      text:  res.body.documents[0].excerpt.replace(/<\/?mark>/g, ''),
      url: `${mdnUrl}/${res.body.documents[0].slug}`,
    };
  } catch (e) {
    if (!(e instanceof HtmlParseError)) throw e;

    msg.respond(`${initialUrl} - ${e.message}`);
    return;
  }

  let response = `${pageData.title.trim()} - ${pageData.text.trim()}`;
  if (response.length > 400) {
    response = `${response.slice(0, 350).trim()}…`;
  }
  response += ` ${pageData.url || initialUrl}`;

  msg.respondWithMention(response);
};

module.exports = mdnPlugin;
