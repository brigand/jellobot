const { processConfig } = require('../getConfig');

it('works', () => {
  const config = processConfig({ nick: 'jellobot' });
  expect(config).toMatchSnapshot();
});
