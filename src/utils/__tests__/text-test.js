const text = require('../text');

describe('text.validate', () => {
  it(`works for good input`, () => {
    const str = 'foo bar baz';
    expect(text.validate(str)).toBe(str);
  });

  it(`throws for for bad input`, () => {
    // Some basic zalgo
    const str =
      '\u0062\u0334\u0061\u0335\u0064\u0334\u0020\u0335\u0074\u0336\u0065\u0338\u0078\u0335\u0074\u0337';
    expect(() => text.validate(str)).toThrow(/diacritics/);
  });
});
