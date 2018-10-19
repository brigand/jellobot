const rng = require('../rngPlugin');

describe('rngPlugin', () => {
  it(`works`, () => {
    rng({
      message: '!pick 2,3',
      respond: output => {
        expect(['3', '2']).toContain(output);
      }
    });

    rng({
      message: '!choose tea, coffee or H2O # what should I drink?',
      respond: output => {
        expect(['tea', 'coffee', 'H2O']).toContain(output);
      }
    });
  });
});
