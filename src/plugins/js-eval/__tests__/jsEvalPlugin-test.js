const jsEval = require('../jsEvalPlugin');

describe('jsEvalPlugin', () => {
  it(`works`, () => {
    jsEval({
      message: 'n> 2+2',
      respond: output => {
        expect(output).toEqual('(okay) 4');
      }
    });
  });

  it(`errors when it should`, () => {
    jsEval({
      message: 'n> 2++2',
      respond: output => {
        expect(output).toEqual(`(error) ecmabot.js:1
 2++2
 ^

ReferenceError: Invalid left-hand side expression in postfix operation`);
      }
    });

    jsEval({
      message: 'n> throw 2',
      respond: output => {
        expect(output).toEqual('(error) 2');
      }
    });
  });

  it(`times out`, () => {
    jsEval({
      message: 'n> setTimeout(() => console.log(2), 15000); 1',
      respond: output => {
        expect(output).toEqual('(timeout) 1');
      }
    });
  });

  it(`exposes node core modules`, () => {
    jsEval({
      message: `n> [fs.readdirSync('.'), child_process.execSync('ls')+'']`,
      respond: output => {
        expect(output).toEqual(`(okay) [ [], '' ]`);
      }
    });
  });

  it(`replies to user`, () => {
    jsEval({
      message: `n>'ok'`,
      mentionUser: 'jay',
      respond: output => {
        expect(output).toEqual(`jay, 'ok'`);
      }
    });
  });
});
