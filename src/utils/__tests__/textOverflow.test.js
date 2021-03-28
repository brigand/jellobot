const overflow = require('../textOverflow');

const asciiAlpha = 'abcdefghijklmnopqrstuvwxyz';
const rainbowFlag = '🏳️‍🌈';

it('works for ascii identity cases', () => {
  const max = asciiAlpha.length;

  const inner = (size) => {
    const s = asciiAlpha.slice(0, size);
    expect({ size, text: overflow.ellipses(s, max).toString() }).toEqual({
      size,
      text: s,
    });
  };

  inner(0);
  inner(1);
  inner(20);
  inner(25);
  inner(26);
  inner(27);
});

it('works for ascii trim cases', () => {
  const inner = (size) => {
    const s = asciiAlpha;
    expect({ size, text: overflow.ellipses(s, size).toString() }).toEqual({
      size,
      text: s.slice(0, size - 4) + ' …',
    });
  };

  inner(5);
  inner(20);
  inner(25);
});

it('works for flag identity cases', () => {
  const bytesPer = Buffer.from(rainbowFlag, 'utf8').length;

  const inner = (count) => {
    const s = rainbowFlag.repeat(count);
    expect({
      count,
      text: overflow.ellipses(s, count * bytesPer).toString(),
    }).toEqual({
      count,
      text: s,
    });
  };

  inner(1);
  inner(2);
  inner(3);
  inner(4);
  inner(5);
});

it('works for flag trim cases', () => {
  const inner = (count, pre = '', post = '') => {
    const flags = rainbowFlag.repeat(count);
    const maxLength = Buffer.from(flags).length;

    const initial = pre + flags;
    const whole = initial + post;

    const expectedFlags = count - 1;
    const expected = Buffer.concat([
      Buffer.from(pre + rainbowFlag.repeat(expectedFlags)),
      Buffer.from('@'),
    ]).toString('utf8');
    expect({
      count,
      pre,
      post,
      maxLength,
      text: overflow.overflow(whole, maxLength, '@').toString(),
    }).toEqual({
      count,
      pre,
      post,
      maxLength,
      text: expected,
    });
  };

  for (let i = 1; i <= 5; i += 1) {
    inner(i, 'a');
    inner(i, '', 'z');
    inner(i, '', rainbowFlag);
  }
});
