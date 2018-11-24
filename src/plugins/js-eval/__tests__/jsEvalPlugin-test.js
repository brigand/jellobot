const jsEval = require('../jsEvalPlugin');

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
        expect(output).toEqual('(okay) 12\n');
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

  // jest doesn't pass this test correctly if we don't await jsEval
  it(`times out but return temporary result`, async () => {
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
});
