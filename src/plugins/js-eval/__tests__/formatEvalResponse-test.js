const formatEvalResponse = require('../formatEvalResponse');

const exampleError = `
undefined:1
 1 +
   ^

SyntaxError: Unexpected end of input
    at Object.<anonymous> (/var/ws/eval-js.js:11:26)
    at Module._compile (module.js:571:32)
    at Object.Module._extensions..js (module.js:580:10)
    at Module.load (module.js:488:32)
    at tryModuleLoad (module.js:447:12)
    at Function.Module._load (module.js:439:3)
    at Module.runMain (module.js:605:10)
    at run (bootstrap_node.js:420:7)
    at startup (bootstrap_node.js:139:9)
    at bootstrap_node.js:535:3
`.trim();

it(`works`, () => {
  expect(formatEvalResponse(`test`)).toBe(`test`);
});

it(`works for error`, () => {
  const res = formatEvalResponse(exampleError);
  expect(res).toMatchSnapshot();
});
