const cp = require('child_process');
const crypto = require('crypto');

const dockerContainer = process.env.NODE_ENV === 'production' ? 'brigand/js-eval' : 'js-eval';

const runDockerContainer = (opts) => {
  const childId = `jseval-${crypto.randomBytes(8).toString('hex')}`;
  const args = [
    `run`,
    `--rm`,
    `-i`,
    `--net=none`,
    `--name=${childId}`,
    dockerContainer,
  ];
  const proc = cp.spawn('docker', args, {
    // env: {},
  });
  const input = `${JSON.stringify(opts)}\n`;
  proc.stdin.write(input);
  proc.stdin.end();

  return new Promise((resolve, reject) => {
    const kill = () => {
      cp.exec(`docker kill ${childId}`, (err) => {
        /* istanbul ignore next */
        if (err) {
          console.error(err);
        }
        /* istanbul ignore next */
        if (err) reject({ reason: 'internal', message: `Failed to kill process` });
        else {
          reject({ reason: 'timeout' });
        }
      });
    };

    const timerId = setTimeout(kill, runDockerContainer.timeout);
    let data = '';
    proc.stdout.on('data', (chunk) => {
      data += chunk;
    });

    /* istanbul ignore next */
    proc.stderr.on('data', (err) => {
      console.error(`docker stderr: `, String(err));
    });
    /* istanbul ignore next */
    proc.on('error', (err) => {
      console.error(`FATAL`, err);
      clearTimeout(timerId);
      reject({ type: 'unknown' });
    });
    proc.on('exit', () => {
      clearTimeout(timerId);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject({ type: 'invalid_json', value: data });
      }
    });
  });
};

runDockerContainer.timeout = 10000;

module.exports = runDockerContainer;
