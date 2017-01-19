const pasteUrlToRaw = require('../pasteUrlToRaw');

it('bpaste', () => {
  expect(pasteUrlToRaw('https://bpaste.net/show/4463220a2c07'))
    .toEqual({js: 'https://bpaste.net/raw/4463220a2c07'});
  expect(pasteUrlToRaw('https://bpaste.net/raw/4463220a2c07'))
    .toEqual({js: 'https://bpaste.net/raw/4463220a2c07'});
});

it('pastebin', () => {
  expect(pasteUrlToRaw('http://pastebin.com/iydu8g2t'))
    .toEqual({js: 'http://pastebin.com/raw/iydu8g2t'});
  expect(pasteUrlToRaw('http://pastebin.com/raw/iydu8g2t'))
    .toEqual({js: 'http://pastebin.com/raw/iydu8g2t'});
});

it('dpaste', () => {
  expect(pasteUrlToRaw('http://dpaste.com/3XB47RJ'))
    .toEqual({js: 'http://dpaste.com/3XB47RJ.txt'});
  expect(pasteUrlToRaw('http://dpaste.com/3XB47RJ.txt'))
    .toEqual({js: 'http://dpaste.com/3XB47RJ.txt'});
});

it('codepen', () => {
  expect(pasteUrlToRaw('https://codepen.io/brigand/pen/JERLwv')).toEqual({
    js: 'https://codepen.io/brigand/pen/JERLwv.js',
    css: 'https://codepen.io/brigand/pen/JERLwv.css',
    html: 'https://codepen.io/brigand/pen/JERLwv.html',
  });
});
