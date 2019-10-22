const cp = require('child_process');
const babel = require('@babel/core');
const babelGenerator = require('@babel/generator').default;
const jsEval = require('./jsEval');
const processTopLevelAwait = require('./processTopLevelAwait');
const { transformPlugins } = require('./babelPlugins');

const helpMsg = [
  `n> node stable`,
  `h> node --harmony`,
  `b> babel`,
  `s> node vm.Script`,
  `m> node vm.SourceTextModule`,
  `e> engine262`,
].join(', ');

// default jseval run command
const CMD = ['node', '--no-warnings', '/run/run.js'];
const CMD_SHIMS = [
  'node',
  '-r',
  '/run/node_modules/airbnb-js-shims/target/es2019',
  '--no-warnings',
  '/run/run.js',
];
const CMD_HARMONY = [
  'node',
  '--harmony',
  '--experimental-vm-modules',
  '--experimental-modules',
  '--no-warnings',
  '/run/run.js',
];

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!/^[nhbsme?]>/.test(message)) return;
  const mode = message[0];
  if (mode === '?') return respond((mentionUser ? `${mentionUser}, ` : '') + helpMsg);
  let code = message.slice(2);

  const hasMaybeTLA = /\bawait\b/.test(code);

  if (mode === 'b' && !hasMaybeTLA) {
    ({ code } = await babel.transformAsync(code, { plugins: transformPlugins }));
  }

  if (hasMaybeTLA) {
    // there's maybe a TLA await
    const iiafe = processTopLevelAwait(code);
    if (iiafe) {
      // there's a TLA
      if (mode === 'b') {
        ({ code } = await babel.transformFromAstAsync(iiafe, code, {
          plugins: transformPlugins,
        }));
      } else {
        ({ code } = babelGenerator(iiafe));
      }
    }
  }

  try {
    const result = await jsEval(
      code,
      mode === 'e'
        ? 'engine262'
        : mode === 's'
        ? 'script'
        : mode === 'm'
        ? 'module'
        : 'node-cjs',
      selfConfig.timer || 5000,
      mode === 'b' ? CMD_SHIMS : mode === 'n' ? CMD : CMD_HARMONY,
    );
    respond((mentionUser ? `${mentionUser}, ` : '(okay) ') + result);
  } catch (e) {
    respond(
      (mentionUser ? `${mentionUser}, ` : `(${e.reason || 'fail'}) `) + e.message,
    ); // Error message always start with Error:
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('exit', () => {
    const cmd = 'docker rm -f $(docker ps -qf name=jseval)';
    cp.exec(cmd, (err, stdout) => {
      console.error(`Command '${cmd}' finished with output`);
      console.error(stdout);
      console.error(`End of '${cmd}' output`);
    });
  });
}

module.exports = jsEvalPlugin;
