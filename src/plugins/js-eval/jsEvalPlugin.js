const cp = require('child_process');
const babel = require('@babel/core');
const jsEval = require('./jsEval');
const processTopLevelAwait = require('./processTopLevelAwait');

const helpMsg = `n> node-cjs stable, h> node-cjs harmony, b> babel (stage1+), s> [script](nodejs.org/api/vm.html#vm_class_vm_script), m> [module](nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule)`;

// default jseval run command
const CMD = ['node', '--no-warnings', '/run/run.js'];
const CMD_SHIMS = ['node', '-r', '/run/node_modules/airbnb-js-shims/target/es2019', '/run/run.js'];
const CMD_HARMONY = ['node', '--harmony-class-fields', '--harmony-private-methods', '--harmony-regexp-sequence', '--harmony-weak-refs', '--harmony-promise-all-settled', '--harmony-intl-bigint', '--harmony-intl-datetime-style', '--harmony-intl-segmenter', '--experimental-vm-modules', '--experimental-modules', '--no-warnings', '/run/run.js'];

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!/^[nhbsm?]>/.test(message)) return;
  const mode = message[0];
  if (mode === '?') return respond((mentionUser ? `${mentionUser}, ` : '') + helpMsg);
  let code = message.slice(2);

  if (mode === 'b') {
    code = (await babel.transformAsync(code, {
      parserOpts: {
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
      },
      plugins: [
        '@babel/plugin-transform-typescript',
        '@babel/plugin-proposal-class-properties',
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        '@babel/plugin-proposal-do-expressions',
        '@babel/plugin-proposal-export-default-from',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-function-sent',
        '@babel/plugin-proposal-function-bind',
        '@babel/plugin-proposal-json-strings',
        '@babel/plugin-proposal-logical-assignment-operators',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        '@babel/plugin-proposal-numeric-separator',
        '@babel/plugin-proposal-optional-catch-binding',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-partial-application',
        ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
        '@babel/plugin-proposal-throw-expressions',
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-syntax-bigint',
        '@babel/plugin-syntax-import-meta',
      ]
    })).code;
  }

  code = processTopLevelAwait(code) || code; // it returns null when no TLA is found

  try {
    const result = await jsEval(
      code,
      mode === 's' ? 'script' : mode === 'm' ? 'module' : 'node-cjs',
      selfConfig.timer || 5000,
      mode === 'b' ? CMD_SHIMS : mode === 'n' ? CMD : CMD_HARMONY
    );
    respond((mentionUser ? `${mentionUser}, ` : '(okay) ') + result);
  } catch (e) {
    respond((mentionUser ? `${mentionUser}, ` : '') + e); // Error message always start with Error:
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
