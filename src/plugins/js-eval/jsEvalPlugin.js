const cp = require('child_process');
const jsEval = require('docker-js-eval');

const helpMsg = `n> node-cjs stable, h> node-cjs harmony, s> script (no process and builtin modules), m> module (import/export). more doc: https://github.com/devsnek/docker-js-eval#js-eval-options`;

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!/^[nhsm?]>/.test(message)) return;
  const code = message.slice(2);
  const mode = message[0];

  if (mode === '?') return respond((mentionUser ? `${mentionUser}, ` : '') + helpMsg);

  try {
    const result = await jsEval(code, mode === 'n' || mode === 'h' ? 'node-cjs' : mode === 's' ? 'script' : 'module', { timeout: selfConfig.timer || 5000, stable: mode === 'n' });
    respond((mentionUser ? `${mentionUser}, ` : '(okay) ') + result);
  } catch (e) {
    respond((mentionUser ? `${mentionUser}, ` : '') + e); // Error message always start with Error:
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('exit', () => {
    cp.exec('docker rm -f $(docker ps -qf name=jseval)', (err, stdout) => {
      console.log(stdout);
    });
  });
}

module.exports = jsEvalPlugin;
