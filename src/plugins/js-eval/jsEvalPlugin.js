const jsEvalPlugin = ({ message }) => {
  const opts = parseMessage(message);
  console.log(`opts`, opts);
};

module.exports = jsEvalPlugin;
