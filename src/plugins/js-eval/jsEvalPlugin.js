const { exec } = require('child_process');
const crypto = require('crypto');

const children = new Set();

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig = { timer: 5000 }, log }) => {
  if (!message.startsWith('n>')) return;
  const code = message.slice(2);

  let didRespond = false;
  let child;
  const childId = `jseval-${crypto.randomBytes(8).toString('hex')}`;

  const done = (err, stdout = '') => {
    if (didRespond) {
      return;
    }
    didRespond = true;
    children.delete(child);

    const prefix = mentionUser ? `${mentionUser}, ` : err ? (err.killed ? '(timeout) ' : '(error) ') : '(okay) ';
    respond(prefix + stdout.trim());
  };

  const timer = setTimeout(() => {
    done({ killed: true }, '');
    child.kill();

    exec(`docker kill "${childId}"`, { encoding: 'utf-8' }, (err, stdout = '', stderr = '') => {
      const ignore = !err || /No such container/.test(`${stdout}\0${stderr}`);
      if (!ignore) {
        log(`Failed to kill docker container ${name}\n${stdout}\n${stderr}`);
      }
    });
  }, 1.5 * selfConfig.timer || 5000);

  child = exec(`docker run --rm -i --net=none --name=${childId} -eJSEVAL_ENV=node-cjs devsnek/js-eval`, { encoding: 'utf-8', timeout: selfConfig.timer || 5000 }, (err, stdout = '') => {
    clearTimeout(timer);
    done(err, stdout);
  });

  children.add(child);

  child.stdin.write(code);
  child.stdin.end();
};

if (process.env.NODE_ENV !== 'test') {
  process.on('exit', () => {
    for (const child of children) {
      child.kill();
    }
  });
}

module.exports = jsEvalPlugin;
