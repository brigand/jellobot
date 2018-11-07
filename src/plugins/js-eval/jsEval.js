const cp = require('child_process');
const crypto = require('crypto');

module.exports = (code, environment = 'node-cjs', timeout = 5000, stable) => new Promise((resolve, reject) => {
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
