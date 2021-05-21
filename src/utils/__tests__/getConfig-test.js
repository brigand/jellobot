const { processConfig } = require('../getConfig');

it('works', () => {
  const config = processConfig({ nick: 'jellobot' });
  expect(config).toMatchSnapshot();
});

it('handles missing servers array', () => {
  const config = processConfig({ nick: 'jellobot' });
  expect(config.nick).toBeUndefined();
  expect(config.servers).toMatchObject([{ nick: 'jellobot' }]);
});

it('handles servers array', () => {
  const config = processConfig({ servers: [{ nick: 'jellobot' }] });
  expect(config.nick).toBeUndefined();
  expect(config.servers).toMatchObject([{ nick: 'jellobot' }]);
});
