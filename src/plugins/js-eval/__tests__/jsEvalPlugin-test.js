const cp = require('child_process');
const jsEval = require('../jsEvalPlugin');

jest.setTimeout(30000);

beforeAll(() => {
  cp.execSync(`${__dirname}/../../../../src/plugins/js-eval/init`);
});

async function testEval(message, opts = {}) {
  return new Promise((resolve) => {
    jsEval({
      ...opts,
      message,
      respond: resolve,
    });
  });
}

describe('jsEvalPlugin', () => {
  it(`works`, async () => {
    const output = await testEval('n> 2+2');
    expect(output).toEqual('(okay) 4');

    const output2 = await testEval('n> setTimeout(() => console.log(2), 1000); 1');
    expect(output2).toEqual('(okay) 12');

    const output3 = await testEval('n> console.warn("test")');
    expect(output3).toEqual(`(okay) test\nundefined`);
  });

  it(`errors when it should`, async () => {
    const output = await testEval('n> 2++2');
    expect(output).toMatch(
      /^\(fail\) (SyntaxError|ReferenceError): Invalid left-hand side expression in postfix operation$/,
    );

    const output2 = await testEval('n> throw 2');
    expect(output2).toEqual('(fail) 2');

    const output3 = await testEval('n> throw new TypeError(2)');
    expect(output3).toEqual('(fail) TypeError: 2');
  });

  it(`times out but return temporary result`, async () => {
    const output = await testEval('n> setTimeout(() => console.log(2), 10000); 1', {
      selfConfig: { timer: 2000 },
    });
    expect(output).toEqual('(timeout) 1');
  });

  it(`exposes node core modules`, async () => {
    const output = await testEval(
      `n> fs.writeFileSync('foo', '..'); [fs.readdirSync('.'), child_process.execSync('ls')+'']`,
    );
    expect(output).toEqual(`(okay) [ [ 'foo' ], 'foo\\n' ]`);
  });

  it(`replies to user`, async () => {
    const output = await testEval(`n>'ok'`, { mentionUser: 'jay' });
    expect(output).toEqual(`jay, 'ok'`);
  });

  it(`replies to user`, async () => {
    const output = await testEval(`n>'ok'`, { mentionUser: 'jay' });
    expect(output).toEqual(`jay, 'ok'`);
  });

  it(`exposes unstable harmony features with h>`, async () => {
    // Currently failing with "Error"
    // const output = await testEval(`h> class A { x = 3n; ok = () => this.x }; new A().ok()`);
    // expect(output).toEqual(`(okay) 3n`);
    // Note: this test failed on previous node.js versions but now passes. It should be replaced
    // with some new feature that only works with harmony flags.
    // const output2 = await testEval(`n> class A { x = 3n; ok = () => this.x }; new A().ok()`);
    // expect(output2).toEqual(`Error: SyntaxError: Unexpected token =`);
  });

  it(`can run babel with b>`, async () => {
    const output = await testEval(
      `b> class A { x = 3n; ok = () => this.x }; new A().ok()`,
    );
    expect(output).toEqual(`(okay) 3n`);
  });

  it(`babel has String.prototype.matchAll`, async () => {
    const output = await testEval(
      `b> [...'1 2 3'.matchAll(/\\d/g)].map(o => o.index)`,
    );
    expect(output).toEqual(`(okay) [ 0, 2, 4 ]`);
  });
  it(`babel has Object.fromEntries`, async () => {
    const output = await testEval(`b> typeof Object.fromEntries`);
    expect(output).toEqual(`(okay) 'function'`);
  });

  it(`handles empty input`, async () => {
    const output = await testEval(`n>  `);
    expect(output).toEqual(`(okay) undefined`);
  });

  describe('top-level-await', () => {
    it('works', async () => {
      expect([
        await testEval('n> var x = await Promise.resolve(2n); x'),
        await testEval('b> var x = await Promise.resolve(2n); x'),
        await testEval('n> var x = await Promise.resolve(2n); if (x) {}'),
        await testEval('b> var x = await Promise.resolve(2n); if (x) {}'),
      ]).toEqual(['(okay) 2n', '(okay) 2n', '(okay) undefined', '(okay) undefined']);
    });

    it('works with comments', async () => {
      const output = await testEval('n> let x=await `wat`; x // test');
      expect(output).toEqual(`(okay) 'wat'`);

      const output2 = await testEval('b> await `wat` // test');
      expect(output2).toEqual(`(okay) 'wat'`);
    });
  });

  it('works with engine262', async () => {
    const output = await testEval('e> ({foo: 1})?.foo ?? 2');
    expect(output).toEqual(`(okay) '1'`);
  });
});
