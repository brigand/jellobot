/* eslint global-require: "off" */

module.exports = () => {
  const plugins = {
    repaste: require('./repaste/repastePlugin'),
  };
  return plugins;
};
