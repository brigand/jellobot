const rng = require('../rngPlugin');

describe('rngPlugin', () => {
  it(`works`, async () => {
    await rng({
      command: { command: '!pick 2,3 # whatever' },
      respondWithMention: (output) => {
        expect(/"[23]"$/.test(output)).toBeTruthy();
      },
    });

    await rng({
      command: { command: '!choose tea, coffee or H2O # what should I drink?' },
      respondWithMention: (output) => {
        expect(/"(tea|coffee|H2O)"$/.test(output)).toBeTruthy();
      },
    });

    await rng({
      command: {
        command: '!which redux, mobx, or plain-context-api? # reactjs state manager',
      },
      respondWithMention: (output) => {
        expect(/"(redux|mobx|plain-context-api)"$/.test(output)).toBeTruthy();
      },
    });
  });
});
