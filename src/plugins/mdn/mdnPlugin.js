const superagent = require('superagent');

const mdnUrl = 'https://developer.mozilla.org'
const mdnSearchApiUrl = `${mdnUrl}/api/v1/search/en-US`

const mdnPlugin = async (msg) => {
  if (!msg.command) return;

  const words = msg.command.command.split(' ');
  if (words[0] !== 'mdn') {
    return;
  }
  msg.handling();

  const query = new URLSearchParams({
    q: words.slice(1).join(' '),
    topic: 'js',
    highlight: false,
  });
  const initialUrl = `${mdnSearchApiUrl}?${query}`;

  let res = null;

  try {
    res = await superagent
      .get(initialUrl)
      .set('accept-language', 'en-US,en;q=0.5')
      .set('Accept', 'application/json')
      .redirects(5);
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
    if (res.body.documents.length > 0) {
      pageData = {
        title: res.body.documents[0].title,
        text:  res.body.documents[0].excerpt,
        url: `${mdnUrl}/${res.body.documents[0].slug}`,
      };
    }
    else {
       pageData = {
         title: 'Not Found',
         text: `Could not find anything on: ${words.slice(1).join(' ')}`,
         url: '',
       } 
    }
  } catch (e) {
    if (!(e instanceof TypeError)) throw e;

    msg.respond(`${initialUrl} - ${e.message}`);
    return;
  }

  let response = `${pageData.title.trim()} - ${pageData.text.trim()}`;
  if (response.length > 400) {
    response = `${response.slice(0, 350).trim()}…`;
  }
  response += ` ${pageData.url}`;

  msg.respondWithMention(response);
};

module.exports = mdnPlugin;
