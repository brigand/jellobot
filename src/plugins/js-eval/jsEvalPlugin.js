const parseEvalMessage = require('./parseEvalMessage');
const runDockerContainer = require('./runDockerContainer');
const formatEvalResponse = require('./formatEvalResponse');

const jsEvalPlugin = ({ mentionUser, respond, respondWithMention, handling, message }) => {
  const params = parseEvalMessage(message); // returns {opts: {}, code: ''}
  if (!params) return;
  handling(params);
  runDockerContainer(params)
    .then((res) => {
      let resMsg = '';
      if (!res || typeof res.success !== 'boolean') {
        console.error(`Unexpected response`, res);
        respondWithMention(`Something went wrong. ${res}`);
        return;
      }
      if (res.success && !mentionUser) {
        resMsg = `${resMsg}(okay) `;
      } else if (!res.success) {
        resMsg = `${resMsg}(error) `;
      }
      resMsg += formatEvalResponse(res.text);

      if (mentionUser) {
        respondWithMention(resMsg);
      } else {
        respond(resMsg);
      }
    })
    .catch((err) => {
      console.error(err);
      respondWithMention(`Something went wrong. ${err}`);
    });
};

module.exports = jsEvalPlugin;
