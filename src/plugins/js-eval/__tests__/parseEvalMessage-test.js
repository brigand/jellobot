const parseEvalMessage = require('../parseEvalMessage');

describe(`opts`, () => {
  const c1 = `n> 1 + 1`;
  it(`works for ${c1}`, () => {
    const res = parseEvalMessage(c1);
    expect(res).toEqual({
      engine: 'node',
      code: ' 1 + 1',
    });
  });

  it(`fail to match case 1`, () => {
    const res = parseEvalMessage('n');
    expect(res).toBe(null);
  });

  it(`fail to match case 2`, () => {
    const res = parseEvalMessage('foo');
    expect(res).toBe(null);
  });
  it(`fail to match case 3`, () => {
    console.error = () => {};
    const res = parseEvalMessage('n>', false);
    expect(res).toBe(null);
  });
  it(`fail to match case 4`, () => {
    console.error = () => {};
    const res = parseEvalMessage('n,engine=idk>', false);
    expect(res).toBe(null);
  });
});
