const pasteUrlToRaw = require('../pasteUrlToRaw');

it('bpaste', () => {
  expect(pasteUrlToRaw('https://bpaste.net/show/4463220a2c07')).toBe('https://bpaste.net/raw/4463220a2c07');
  expect(pasteUrlToRaw('https://bpaste.net/raw/4463220a2c07')).toBe('https://bpaste.net/raw/4463220a2c07');
});
