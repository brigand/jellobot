const superagent = require('superagent');
const cheerio = require('cheerio');

function slugify(words) {
  return words
    .map(x => x.trim().toLowerCase())
    .join('-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/[^a-zA-Z0-9]+/g, '-');
}

class HtmlParseError extends Error {}

function getMdnTitle(title) {
  return title
    .replace(/\s*-\s*(\w+\s*\w*)\s*\|\s*MDN/gi, (m, _type) => {
      let type = _type;
      if (type === 'JavaScript') type = null;
      if (type === 'Web APIs') type = 'DOM';
      return type ? `, ${type}` : '';
    });
}

function extractFromHtml(html) {
  const $ = cheerio.load(html);
  const title = getMdnTitle($('head title').text());
  const text = $('#wikiArticle')
    .first()
    .find('p')
    .first()
    .text();

  if (!text) {
    const bodyText = $('body').text().replace(/\s+/g, ' ');

    if (/did not match any documents|No results containing all your search terms were found/.test(bodyText)) {
      throw new HtmlParseError(`No MDN page found with this search.`);
    }
    throw new HtmlParseError(`Failed to extract mdn text`);
  }
  return { text, title };
}

const mdnPlugin = async (msg) => {
  if (!msg.command) return;

  const words = msg.command.command.split(' ');
  if (words[0] !== 'mdn') {
    return;
  }
  msg.handling();


  const suffix = slugify(words.slice(1));
  const url = `https://mdn.io/${suffix}`;

  const res = await superagent.get(url).redirects(5);
  if (!res.ok) {
    msg.respond(`Couldn't fetch "${url}"`);
    return;
  }

  let pageData;
  try {
    pageData = extractFromHtml(res.text);
  } catch (e) {
    if (!(e instanceof HtmlParseError)) throw e;

    msg.respond(`${url} - ${e.message}`);
    return;
  }

  let response = `${pageData.title.trim()} - ${pageData.text.trim()}`;
  if (response.length > 400) {
    response = `${response.slice(0, 350).trim()}…`;
  }
  response += ` ${url}`;

  msg.respondWithMention(response);
};

module.exports = mdnPlugin;
