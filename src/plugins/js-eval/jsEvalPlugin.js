const cp = require('child_process');
const crypto = require('crypto');
const babel = require('@babel/core');

const babelTransform = code => new Promise((res, rej) => babel.transform(
  code,
  { filename: 'script.js' },
  (err, obj) => err ? rej(err) : res(obj.code)
));

const helpMsg = `n> node-cjs stable, h> node-cjs harmony, b> babel (stage1+), s> [script](nodejs.org/api/vm.html#vm_class_vm_script), m> [module](nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule)`;

const jsEval = (code, environment = 'node-cjs', timeout = 5000, stable) => new Promise((resolve, reject) => {
  const name = `jseval-${crypto.randomBytes(8).toString('hex')}`;
  const args = ['run', '--rm', '-i', `--name=${name}`, `--net=none`, `-eJSEVAL_ENV=${environment}`, `-eJSEVAL_TIMEOUT=${timeout}`, 'brigand/js-eval'];

  if (stable) args.push('node', '/run/run.js');

  let data = '';
  const timer = setTimeout(() => {
    try {
      cp.execSync(`docker kill --signal=9 ${name}`);
      reject(new Error('(timeout) ' + data)); // send data received so far
    } catch (e) {
      reject(e);
    }
  }, timeout + 10);

  const proc = cp.spawn('docker', args);
  proc.stdin.write(code);
  proc.stdin.end();

  proc.stdout.on('data', (chunk) => {
    data += chunk;
  });

  proc.on('error', (e) => {
    clearTimeout(timer);
    reject(e);
  });

  proc.on('exit', (status) => {
    clearTimeout(timer);
    if (status !== 0) {
      reject(new Error(data));
    } else {
      resolve(data);
    }
  });
});

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
      mode === 'n'
    );
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
