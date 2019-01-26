const cp = require('child_process');
const babel = require('@babel/core');
const jsEval = require('./jsEval');

const babelTransform = code => new Promise((res, rej) => babel.transform(
  code,
  { filename: 'script.js' },
  (err, obj) => err ? rej(err) : res(obj.code)
));

const helpMsg = `n> node-cjs stable, h> node-cjs harmony, b> babel (stage1+), s> [script](nodejs.org/api/vm.html#vm_class_vm_script), m> [module](nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule)`;

// default jseval run command
const CMD = ['node', '--no-warnings', '/run/run.js'];
const CMD_SHIMS = ['node', '-r', '/run/node_modules/airbnb-js-shims/target/es2019', '/run/run.js'];
const CMD_HARMONY = ['node', '--harmony-bigint', '--harmony-class-fields', '--harmony-private-fields', '--harmony-static-fields', '--harmony-public-fields', '--harmony-do-expressions', '--harmony-await-optimization', '--experimental-vm-modules', '--experimental-modules', '--no-warnings', '/run/run.js'];

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!/^[nhbsm?]>/.test(message)) return;
  const mode = message[0];
  if (mode === '?') return respond((mentionUser ? `${mentionUser}, ` : '') + helpMsg);
  let code = message.slice(2);
  if (mode === 'b') code = await babelTransform(message.slice(2));

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
