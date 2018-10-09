const cp = require('child_process');
const jsEval = require('docker-js-eval');

/**
 * n> node-cjs stable
 * s> evaluate code as ES Script https://nodejs.org/api/vm.html#vm_class_vm_script
 * m> evaluate code as ES Module https://nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule
 * n+>, s+>, m+> same functionalities with unstable harmony flags
 * (more doc: https://github.com/devsnek/docker-js-eval#js-eval-options)
 */
const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!/^[nsm]\+?>/.test(message)) return;
  const code = message.slice(2);
  const mode = message[0];

  try {
    const result = await jsEval(code, mode === 'n' ? 'node-cjs' : mode === 's' ? 'script' : 'module', { timeout: selfConfig.timer || 5000, stable: message[1] !== '+' });
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
