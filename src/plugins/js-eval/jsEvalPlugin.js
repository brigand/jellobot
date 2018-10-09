const cp = require('child_process');
const crypto = require('crypto');

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = {} }) => {
  if (!message.startsWith('n>')) return;
  const code = message.slice(2);

  const name = `jseval-${crypto.randomBytes(8).toString('hex')}`;
  const proc = cp.spawn('docker', ['run', '--rm', '-i', `--name=${name}`, '--net=none', 'brigand/js-eval']);

  proc.stdin.write(code);
  proc.stdin.end();

  let data = '';

  const timer = setTimeout(() => {
    cp.exec(`docker kill ${name}`, () => {
      respond((mentionUser ? `${mentionUser}, ` : '(timeout) ') + data);
    });
  }, selfConfig.timer || 5000);

  proc.stdout.on('data', (chunk) => {
    data += chunk;
  });

  proc.on('error', (e) => {
    clearTimeout(timer);
    respond((mentionUser ? `${mentionUser}, ` : '(error) ') + e);
  });

  proc.on('exit', (status) => {
    clearTimeout(timer);
    respond((mentionUser ? `${mentionUser}, ` : status === 0 ? '(okay) ' : '(error) ') + data);
  });
};

if (process.env.NODE_ENV !== 'test') {
  process.on('exit', () => {
    cp.exec('docker rm -f $(docker ps -qf name=jseval)', (err, stdout) => {
      console.log(stdout);
    });
  });
}

module.exports = jsEvalPlugin;
