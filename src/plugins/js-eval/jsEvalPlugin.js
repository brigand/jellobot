const parseEvalMessage = require('./parseEvalMessage');
const runDockerContainer = require('./runDockerContainer');
const formatEvalResponse = require('./formatEvalResponse');
const parseCode = require('./parseCode');
// const annotateCode = require('./annotateCode');
const parseOutput = require('./parseOutput');

const jsEvalPlugin = ({ mentionUser, respond, respondWithMention, handling, message }) => {
  const initialParams = parseEvalMessage(message);
  if (!initialParams) return;
  handling(initialParams);

  // let ast = null;
  try {
    parseCode(initialParams.code);
    // ast = parseCode(initialParams.code);
  } catch (e) {
    respondWithMention(`Failed to parse code: ${e.message}`);
    return;
  }

  // const annotated = annotateCode(ast);
  // const params = { ...initialParams, code: annotated };
  const params = { ...initialParams, code: initialParams.code };

  runDockerContainer(params)
    .then((res) => {
      let resMsg = '';
      if (!res || typeof res.success !== 'boolean') {
        console.error(`Unexpected response`, res);
        respondWithMention(`Something went wrong. ${res}`);
        return;
      }

      // const { meta, text } = parseOutput(res.text);
      const { text } = parseOutput(res.text);


      if (res.success && !mentionUser) {
        resMsg = `${resMsg}(okay) `;
      } else if (!res.success) {
        resMsg = `${resMsg}(error) `;
      }
      resMsg += formatEvalResponse(text);

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
