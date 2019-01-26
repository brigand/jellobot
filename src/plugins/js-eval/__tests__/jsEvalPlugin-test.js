const cp = require('child_process');
const jsEval = require('../jsEvalPlugin');

beforeAll(() => {
  cp.execSync(`${__dirname}/../../../../src/plugins/js-eval/init`);
});

describe('jsEvalPlugin', () => {
  it(`works`, async () => {
    await jsEval({
      message: 'n> 2+2',
      respond: output => {
        expect(output).toEqual('(okay) 4');
      }
    });

    await jsEval({
      message: 'n> setTimeout(() => console.log(2), 1000); 1',
      respond: output => {
        expect(output).toEqual('(okay) 12');
      }
    });
  });

  it(`errors when it should`, async () => {
    await jsEval({
      message: 'n> 2++2',
      respond: output => {
        expect(output).toEqual(`Error: ReferenceError: Invalid left-hand side expression in postfix operation`);
      }
    });

    await jsEval({
      message: 'n> throw 2',
      respond: output => {
        expect(output).toEqual('Error: 2');
      }
    });
  });

  it(`times out but return temporary result`, async () => { // jest doesn't pass this test correctly if we don't await jsEval
    await jsEval({
      message: 'n> setTimeout(() => console.log(2), 10000); 1',
      selfConfig: { timer: 1000 },
      respond: output => {
        expect(/^Error: \(?timeout\)?/.test(output)).toBeTruthy(); // current devsnek/js-eval has no parens, there's a PR to add them + code result until then
      }
    });
  });

  it(`exposes node core modules`, async () => {
    await jsEval({
      message: `n> fs.writeFileSync('foo', '..'); [fs.readdirSync('.'), child_process.execSync('ls')+'']`,
      respond: output => {
        expect(output).toEqual(`(okay) [ [ 'foo' ], 'foo\\n' ]`);
      }
    });
  });

  it(`replies to user`, async () => {
    await jsEval({
      message: `n>'ok'`,
      mentionUser: 'jay',
      respond: output => {
        expect(output).toEqual(`jay, 'ok'`);
      }
    });
  });

  it(`replies to user`, async () => {
    await jsEval({
      message: `n>'ok'`,
      mentionUser: 'jay',
      respond: output => {
        expect(output).toEqual(`jay, 'ok'`);
      }
    });
  });

  it(`exposes unstable harmony features with h>`, async () => {
    await jsEval({
      message: `h> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      respond: output => {
        expect(output).toEqual(`(okay) 3n`);
      }
    });

    await jsEval({
      message: `n> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      respond: output => {
        expect(output).toEqual(`Error: SyntaxError: Unexpected token =`);
      }
    });
  });

  it(`can run babel with b>`, async () => {
    await jsEval({
      message: `b> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      respond: output => {
        expect(output).toEqual(`(okay) 3n`);
      }
    });
  });

  it('has date-fns', async () => {
    await jsEval({
      message: `n> require('date-fns').subDays(new Date(2018,10,5), 10)`,
      respond: output => {
        expect(output).toEqual(`(okay) 2018-10-26T00:00:00.000Z`);
      }
    });
  });

  it(`babel has String.prototype.matchAll`, async () => {
    await jsEval({
      message: `b> [...'1 2 3'.matchAll(/\\d/g)].map(o => o.index)`,
      respond: output => {
        expect(output).toEqual(`(okay) [ 0, 2, 4 ]`);
      }
    });
  });
  it(`babel has Object.fromEntries`, async () => {
    await jsEval({
      message: `b> typeof Object.fromEntries`,
      respond: output => {
        expect(output).toEqual(`(okay) 'function'`);
      }
    });
  });

  it(`handles empty input`, async () => {
    await jsEval({
      message: `n>  `,
      respond: output => {
        expect(output).toEqual(`(okay) undefined`);
      }
    });
  });
});
