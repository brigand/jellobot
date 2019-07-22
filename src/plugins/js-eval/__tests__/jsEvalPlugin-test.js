const cp = require('child_process');
const jsEval = require('../jsEvalPlugin');

beforeAll(() => {
  cp.execSync(`${__dirname}/../../../../src/plugins/js-eval/init`);
});

async function testEval(message, opts = {}) {
  return new Promise((resolve) => {
    jsEval({
      ...opts,
      message,
      respond: resolve
    });
  });
}

describe('jsEvalPlugin', () => {
  it(`works`, async () => {
    const output = await testEval('n> 2+2');
    expect(output).toEqual('(okay) 4');

    const output2 = await testEval('n> setTimeout(() => console.log(2), 1000); 1');
    expect(output2).toEqual('(okay) 12');
  });

  it(`errors when it should`, async () => {
    const output = await testEval('n> 2++2');
    expect(output).toEqual(`Error: ReferenceError: Invalid left-hand side expression in postfix operation`);

    const output2 = await testEval('n> throw 2');
    expect(output2).toEqual('Error: 2');
  });

  it(`times out but return temporary result`, async () => { // jest doesn't pass this test correctly if we don't await jsEval
    const output = await testEval('n> setTimeout(() => console.log(2), 10000); 1', { selfConfig: { timer: 1000 } });
    // current devsnek/js-eval has no parens, there's a PR to add them + code result until then
    expect(/^Error: \(?timeout\)?/.test(output)).toBeTruthy();
  });

  it(`exposes node core modules`, async () => {
    const output = await testEval(`n> fs.writeFileSync('foo', '..'); [fs.readdirSync('.'), child_process.execSync('ls')+'']`);
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
    // const output = await testEval(`h> class A { x = 3n; ok = () => this.x }; new A().ok()`);
    // expect(output).toEqual(`(okay) 3n`);

    const output2 = await testEval(`n> class A { x = 3n; ok = () => this.x }; new A().ok()`);
    expect(output2).toEqual(`Error: SyntaxError: Unexpected token =`);
  });

  it(`can run babel with b>`, async () => {
    const output = await testEval(`b> class A { x = 3n; ok = () => this.x }; new A().ok()`);
    expect(output).toEqual(`(okay) 3n`);
  });

  it('has date-fns', async () => {
    const output = await testEval(`n> require('date-fns').subDays(new Date(2018,10,5), 10)`);
    expect(output).toEqual(`(okay) 2018-10-26T00:00:00.000Z`);
  });

  it(`babel has String.prototype.matchAll`, async () => {
    const output = await testEval(`b> [...'1 2 3'.matchAll(/\\d/g)].map(o => o.index)`);
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
});
