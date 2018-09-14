const jsEval = require('../jsEvalPlugin');

describe('jsEvalPlugin', () => {
  it(`works`, () => {
    jsEval({
      message: 'n> 2+2',
      respond: output => {
        expect(output).toEqual('4');
      }
    });
  });

  it(`errors when it should`, () => {
    jsEval({
      message: 'n> 2++2',
      respond: output => {
        expect(output).toEqual(`ecmabot.js:1
 2++2
 ^

ReferenceError: Invalid left-hand side expression in postfix operation`);
      }
    });

    jsEval({
      message: 'n> throw 2',
      respond: output => {
        expect(output).toEqual('2');
      }
    });
  });

  it(`times out`, () => {
    jsEval({
      message: 'n> setTimeout(() => {}, 50000)',
      respond: output => {
        expect(output).toEqual('Timeout');
      }
    });
  });

  it(`exposes node core modules`, () => {
    jsEval({
      message: `n> fs.readdirSync('.')`,
      respond: output => {
        expect(output).toEqual(`[
  'run.js',
  'run.sh'
]`);
      }
    });
  });
});
