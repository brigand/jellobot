const superagent = require('superagent');

const createGist = (opts) => {
  const {files, tryShortUrl, githubToken} = opts;
  const body = {
    files: {},
    private: true,
  };
  Object.keys(files).forEach((fileName) => {
    body.files[fileName] = {content: files[fileName]};
  });
  const req = superagent.post('https://api.github.com/gists')
  req.send(body);
  if (githubToken) {
    req.set('Authorization', `token ${githubToken}`);
  }
  return req.then((gistRes) => {
    const gistUrl = gistRes.body.html_url;

    if (!tryShortUrl) return {url: gistUrl, id: gistRes.body.id};

    return superagent.post('https://git.io/').send(`url=${gistUrl}`)
    .then((shortRes) => {
      const {location} = shortRes.headers;
      if (location) return {url: location, id: gistRes.body.id};
      console.error('Failed to create short url');
      console.error(shortRes.body);
      return {url: gistUrl, id: gistRes.body.id};
    }, (shortRes) => {
      console.error('Failed to create short url');
      console.error(shortRes.body);
      return {url: gistUrl, id: gistRes.body.id};
    });
  }, (errRes) => {
    console.error(`gist error message: ${errRes.message}`);
    console.error(`gist error body: ${errRes.body}`);
    const error = new Error(`Couldn't create gist.`);
    error.gistError = true;
    throw error;
  });
};

const deleteGist = ({id, githubToken}) => {
  const req = superagent.del(`https://api.github.com/gists/${id}`)
  req.set('Authorization', `token ${githubToken}`);
  return req.then(() => null);
};

exports.createGist = createGist;
exports.deleteGist = deleteGist;
