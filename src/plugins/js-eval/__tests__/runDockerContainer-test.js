const runDockerContainer = require('../runDockerContainer');

describe('runDockerContainer', () => {
  it(`works`, () => {
    const opts = {
      code: '1 + 1',
      engine: 'node',
    };
    runDockerContainer.timeout = 10000;
    return runDockerContainer(opts).then((res) => {
      expect(res).toEqual({
        success: true,
        text: '2',
      });
    });
  });

  it(`times out`, () => {
    const opts = {
      code: 'setTimeout(() => {}, 50000)',
      engine: 'node',
    };
    runDockerContainer.timeout = 1000;

    return runDockerContainer(opts).then(
      (res) => {
        console.error(res);
        throw new Error(`Expected promise to reject for timeout`);
      },
      (err) => {
        expect(err).toEqual({ reason: 'timeout' });
      },
    );
  });

  // it(`logs errors`, () => {
  //   const opts = {
  //     idk: 'whatever',
  //   };
  //   runDockerContainer.timeout = 10000;
  //   return runDockerContainer(opts).then((res) => {
  //     expect(res).toEqual({
  //       success: true,
  //       text: '2',
  //     });
  //   });
  // });
});
