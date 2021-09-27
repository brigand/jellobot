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
      // dockerCmd: './duck',
      // runFilePath: './run.js',
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
    expect(output3).toEqual(`(okay) test`);
  });

  it(`errors when it should`, async () => {
    const output = await testEval('n> 2++2');
    expect(output).toEqual(
      `(fail) SyntaxError: Invalid left-hand side expression in postfix operation`,
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
      `n> fs.writeFileSync('foo', '..'); process.nextTick(() => fs.unlinkSync('foo')); child_process.execSync('cat foo')+''`,
    );
    expect(output).toEqual(`(okay) '..'`);
  });

  it(`replies to user`, async () => {
    const output = await testEval(`n>'ok'`, { mentionUser: 'jay' });
    expect(output).toEqual(`jay, 'ok'`);
  });

  it(`replies to user`, async () => {
    const output = await testEval(`n>'ok'`, { mentionUser: 'jay' });
    expect(output).toEqual(`jay, 'ok'`);
  });

  it(`handles empty input`, async () => {
    const output = await testEval(`n>  `);
    expect(output).toEqual(`(okay) undefined`);
  });


  describe('babel', () => {
    it(`runs with b>`, async () => {
      const output = await testEval(
        `b> class A { x = 3n; ok = () => this.x }; new A().ok()`,
      );
      expect(output).toEqual(`(okay) 3n`);
    });

    it(`has String.prototype.matchAll`, async () => {
      const output = await testEval(
        `b> [...'1 2 3'.matchAll(/\\d/g)].map(o => o.index)`,
      );
      expect(output).toEqual(`(okay) [ 0, 2, 4 ]`);
    });

    it(`has decorators`, async () => {
      // TODO put a relevant example, I couldn't find one to work, maybe the plugin is not up to date
      // e.g. b> @x class C {} function x(target) { target.x = true; } [C.x, new C().x] both are undefined
      // https://github.com/tc39/proposal-decorators#class-methods examples fail because the decorator function in the babel proposal doesn't even receive a second arg
    });

    it('has pipelines', async () => {
      const output = await testEval(`b> 2 |> % + 1`);
      expect(output).toEqual(`(okay) 3`);
    });
  });


  describe('top-level-await', () => {
    it('works', async () => {
      expect([
        await testEval('n> var x = await Promise.resolve(2n); x'),
        await testEval('b> var x = await Promise.resolve(2n); x'),
        await testEval('n> var x = await Promise.resolve(2n); if (x) {}'),
        await testEval('b> var x = await Promise.resolve(2n); if (x) {}'),
        await testEval(
          `n> function foo(){}; let o={[await 'foo']: await eval('1')}; o`,
        ),
      ]).toEqual([
        '(okay) 2n',
        '(okay) 2n',
        '(okay) undefined',
        '(okay) undefined',
        '(okay) { foo: 1 }',
      ]);
    });

    it('works with comments', async () => {
      const output = await testEval('n> let x=await `wat`; x // test');
      expect(output).toEqual(`(okay) 'wat'`);

      const output2 = await testEval('b> await `wat` // test');
      expect(output2).toEqual(`(okay) 'wat'`);
    });
  });

  describe('engine262', () => {
    it('works', async () => {
      const output = await testEval('e> ({foo: 1})?.foo ?? 2');
      expect(output).toEqual(`(okay) 1`);
    });

    it(`adds print() global util, because there's no console`, async () => {
      const output = await testEval('e> print(0b1); print(2n); Math.PI|0');
      expect(output).toEqual(`(okay) 1\n2n\n3`);
    });

    it(`errors when it should`, async () => {
      const output = await testEval('e> 2++2');
      expect(output).toEqual(`(fail) 2++2\n    ^\nSyntaxError: Unexpected token`);

      const output2 = await testEval('e> throw 2');
      expect(output2).toEqual(`(fail) 2`);

      const output3 = await testEval('e> throw new TypeError(2)');
      expect(output3).toEqual(`(fail) TypeError: 2\n    at <anonymous>:1:22`);
    });
  });
});
