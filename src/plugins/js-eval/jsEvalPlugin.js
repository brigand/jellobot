const { exec } = require('child_process');
const evalUtils = require('./evalUtils');

const children = new Set();

const jsEvalPlugin = async ({ mentionUser, respond, message, selfConfig, log }) => {
  if (!message.startsWith('n>')) return;
  const code = message.slice(2);
  const childId = evalUtils.names.make();

  let didRespond = false;
  let child;

  const done = (err, stdout = '') => {
    if (didRespond) {
      return;
    }
    didRespond = true;
    children.delete(child);

    const msg = err && err.killed ? 'Timeout' : stdout.trim();
    const prefix = mentionUser ? `${mentionUser}, ` : err ? '(error) ' : '(okay) ';
    respond(prefix + msg);
  };

  const timer = setTimeout(() => {
    done({ killed: true }, '');
    child.kill();

    exec(`docker kill "${childId}"`, { encoding: 'utf-8'}, (err, stdout = '', stderr = '') => {
      const ignore = !err || /No such container/.test(`${stdout}\0${stderr}`);
      if (!ignore) {
        log(`Failed to kill docker container ${name}\n${stdout}\n${stderr}`);
      }
    });
  }, selfConfig.timer || 5000);

  child = exec(`docker run --rm -i --net=none --name=${childId} -eJSEVAL_ENV=node-cjs brigand/js-eval`, { encoding: 'utf-8'}, (err, stdout = '') => {
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
