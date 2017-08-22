const parseEvalMessage = require('../parseEvalMessage');

describe(`opts`, () => {
  const c1 = `n> 1 + 1`;
  it(`works for ${c1}`, () => {
    const res = parseEvalMessage(c1);
    expect(res).toEqual({
      opts: {},
      code: ' 1 + 1',
    });
  });

  const c2 = `n,foo=bar,baz> 1 + 1`;
  it(`works for ${c2}`, () => {
    const res = parseEvalMessage(c2);
    expect(res).toEqual({
      opts: {
        foo: 'bar',
        baz: true,
      },
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
});
