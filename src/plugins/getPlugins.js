/* eslint global-require: "off" */

module.exports = () => {
  const plugins = {
    repaste: require('./repaste/repastePlugin'),
    rng: require('./rng/rngPlugin'),
    factoid: require('./factoids/factoidsPlugin'),
//    jsEval: require('./js-eval/jsEvalPlugin'),
  };
  return plugins;
};
