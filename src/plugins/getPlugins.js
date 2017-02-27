/* eslint global-require: "off" */

module.exports = () => {
  const plugins = {
    repaste: require('./repaste/repastePlugin'),
    rng: require('./rng/rngPlugin'),
  };
  return plugins;
};
