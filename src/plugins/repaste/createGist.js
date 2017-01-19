const superagent = require('superagent');

const createGist = (opts) => {
  const {files, tryShortUrl} = opts;
  const body = {
    files: {},
    private: true,
  };
  Object.keys(files).forEach((fileName) => {
    body.files[fileName] = {content: files[fileName]};
  });
  return superagent.post('https://api.github.com/gists')
  .send(body)
  .then((gistRes) => {
    const gistUrl = gistRes.body.html_url;

    if (!tryShortUrl) return gistUrl;

    return superagent.post('https://git.io/').send(`url=${gistUrl}`)
    .then((shortRes) => {
      const {location} = shortRes.headers;
      if (location) return location;
      console.error('Failed to create short url');
      console.error(shortRes.body);
      return gistUrl;
    }, (shortRes) => {
      console.error('Failed to create short url');
      console.error(shortRes.body);
      return gistUrl;
    });
  }, (errRes) => {
    console.error(`gist error message: ${errRes.message}`);
    console.error(`gist error body: ${errRes.body}`);
    const error = new Error(`Couldn't create gist.`);
    error.gistError = true;
    throw error;
  });
};

module.exports = createGist;
