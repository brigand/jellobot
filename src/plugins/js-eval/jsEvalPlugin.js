const cp = require('child_process');
const babel = require('@babel/core');
const babelGenerator = require('@babel/generator').default;
const jsEval = require('./jsEval');
const processTopLevelAwait = require('./processTopLevelAwait');
const { transformPlugins } = require('./babelPlugins');

const helpMsg = `n> node stable, h> node --harmony, b> babel, s> node vm.Script, m> node vm.SourceTextModule, e> engine262`;

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

  const hasMaybeTLA = mode !== 'e' && /\bawait\b/.test(code); // engine262 ships TLA

  if (mode === 'b' && !hasMaybeTLA) {
    code = (await babel.transformAsync(code, { plugins: transformPlugins })).code;
  }

  if (hasMaybeTLA) {
    // there's maybe a TLA await
    const iiafe = processTopLevelAwait(code);
    if (iiafe) {
      // there's a TLA
      if (mode === 'b') {
        code = (await babel.transformFromAstAsync(iiafe, code, {
          plugins: transformPlugins,
        })).code;
      } else {
        code = babelGenerator(iiafe).code;
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

    let clean = result.trim();

    clean = clean.replace(/(\S)\s*⬊ (undefined|null)$/, '$1');
    clean = clean.replace(/⬊\s*/, '');
    clean = clean.trim();

    respond((mentionUser ? `${mentionUser}, ` : '(okay) ') + clean);
  } catch (e) {
    let clean = e.message.trim();
    clean = clean.replace(/⬊\s*/, '');
    clean = clean.trim();

    respond((mentionUser ? `${mentionUser}, ` : `(${e.reason || 'fail'}) `) + clean); // Error message always start with Error:
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
