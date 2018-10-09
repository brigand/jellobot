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
        expect(output).toEqual(`Error: ecmabot.js:1
 2++2
 ^

ReferenceError: Invalid left-hand side expression in postfix operation`);
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
        expect(output).toEqual('Error: (timeout) 1');
      }
    });
  });

  it(`exposes node core modules`, async () => {
    await jsEval({
      message: `n> [fs.readdirSync('.'), child_process.execSync('ls')+'']`,
      respond: output => {
        expect(output).toEqual(`(okay) [ [], '' ]`);
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

  it(`exposes unstable harmony features with n+>`, async () => {
    await jsEval({
      message: `h> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      respond: output => {
        expect(output).toEqual(`(okay) 3n`);
      }
    });

    await jsEval({
      message: `n> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      respond: output => {
        expect(output).toEqual(`Error: ecmabot.js:1
 class A { x = 3n; ok = () => this.x }; new A().ok()
             ^

SyntaxError: Unexpected token =`);
      }
    });
  });
});
