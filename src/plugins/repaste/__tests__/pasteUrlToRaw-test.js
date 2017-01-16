const pasteUrlToRaw = require('../pasteUrlToRaw');

it('bpaste', () => {
  expect(pasteUrlToRaw('https://bpaste.net/show/4463220a2c07')).toBe('https://bpaste.net/raw/4463220a2c07');
  expect(pasteUrlToRaw('https://bpaste.net/raw/4463220a2c07')).toBe('https://bpaste.net/raw/4463220a2c07');
});

it('pastebin', () => {
  expect(pasteUrlToRaw('http://pastebin.com/iydu8g2t')).toBe('http://pastebin.com/raw/iydu8g2t');
  expect(pasteUrlToRaw('http://pastebin.com/raw/iydu8g2t')).toBe('http://pastebin.com/raw/iydu8g2t');
});

it('dpaste', () => {
  expect(pasteUrlToRaw('http://dpaste.com/3XB47RJ')).toBe('http://dpaste.com/3XB47RJ.txt');
  expect(pasteUrlToRaw('http://dpaste.com/3XB47RJ.txt')).toBe('http://dpaste.com/3XB47RJ.txt');
});

it('codepen', () => {
  expect(pasteUrlToRaw('https://codepen.io/brigand/pen/JERLwv')).toBe('https://codepen.io/brigand/pen/JERLwv.js');
});
