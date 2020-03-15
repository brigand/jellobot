const url = require('url');
const superagent = require('superagent');
const cheerio = require('cheerio');

function slugify(words) {
  return words
    .map((x) => x.trim().toLowerCase())
    .join('-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/[^a-zA-Z0-9]+/g, '-');
}

class HtmlParseError extends Error {}

function getMdnTitle(title) {
  return title.replace(/\s*-\s*(\w+\s*\w*)\s*\|\s*MDN/gi, (m, _type) => {
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
    const bodyText = $('body')
      .text()
      .replace(/\s+/g, ' ');

    if (
      /did not match any documents|No results containing all your search terms were found/.test(
        bodyText,
      )
    ) {
      throw new HtmlParseError(`No MDN page found with this search.`);
    }
    throw new HtmlParseError(`Failed to extract mdn text`);
  }
  return { text, title };
}

async function fixLanguage(origRes, lastRedirect) {
  let res = origRes;

  // attempt to rewrite the language part of the URL
  const urlParts = url.parse(lastRedirect);
  urlParts.pathname = urlParts.pathname.replace(
    /^\/(\w+)(\/docs\/)/,
    (m, lang, rest) => {
      return `/en-US${rest}`;
    },
  );

  // If we changed the URL, we need to do another request for it
  const fixedUrl = url.format(urlParts);

  if (fixedUrl !== lastRedirect) {
    console.error(`Translated MDN URL from "${lastRedirect}" to "${fixedUrl}"`);
    res = await superagent.get(fixedUrl).redirects(1);
  }

  return res;
}

async function fixRedirect(res) {
  const $ = cheerio.load(res.text);
  const script = $('script').get()[0].children[0].data;
  const reg = /(window.location.replace\(\'\/l\/\?kh=-1&uddg=)(.*)(\'\))/;
  const match = script.match(reg);
  if (!match) {
    return res;
  }

  const redirect = decodeURIComponent(match[2]);
  const redirectURL = new URL(redirect);

  if (
    redirectURL.host === 'developer.mozilla.org' &&
    (redirectURL.protocol === 'https:' || redirectURL.protocol === 'http:')
  ) {
    const redirectRes = await superagent
      .get(redirect)
      .set('accept-language', 'en-US,en;q=0.5')
      .redirects(5);
    return redirectRes;
  }

  return res;
}

const mdnPlugin = async (msg) => {
  if (!msg.command) return;

  const words = msg.command.command.split(' ');
  if (words[0] !== 'mdn') {
    return;
  }
  msg.handling();

  const suffix = slugify(words.slice(1));
  const initialUrl = `https://mdn.io/${suffix}`;

  let lastRedirect = initialUrl;
  let res = null;

  try {
    res = await superagent
      .get(initialUrl)
      .set('accept-language', 'en-US,en;q=0.5')
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

  if (res) {
    res = await fixLanguage(res, lastRedirect).catch(() => null);
  }

  if (res) {
    res = await fixRedirect(res).catch(() => null);
  }

  if (!res || !res.ok) {
    msg.respondWithMention(`Try ${initialUrl} (couldn't fetch metadata)`);
    return;
  }

  let pageData;
  try {
    pageData = extractFromHtml(res.text);
  } catch (e) {
    if (!(e instanceof HtmlParseError)) throw e;

    msg.respond(`${initialUrl} - ${e.message}`);
    return;
  }

  let response = `${pageData.title.trim()} - ${pageData.text.trim()}`;
  if (response.length > 400) {
    response = `${response.slice(0, 350).trim()}…`;
  }
  response += ` ${initialUrl}`;

  msg.respondWithMention(response);
};

module.exports = mdnPlugin;
