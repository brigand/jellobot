const { exec } = require('child_process');
const crypto = require('crypto');

const jsEvalPlugin = ({ mentionUser, respond, message }) => {
  if (!message.startsWith('n>')) return;
  const code = message.slice(2);
  const childId = `jseval-${crypto.randomBytes(8).toString('hex')}`;

  const child = exec(`docker run --rm -i --net=none --name=${childId} devsnek/js-eval`, { timeout: 5000 }, (err, stdout = '') => {
    const msg = err && err.killed ? 'Timeout' : stdout.trim();
    const prefix = mentionUser ? `${mentionUser}, ` : err ? '(error) ' : '(okay) ';
    return respond(prefix + msg);
  });

  child.stdin.write(JSON.stringify({ environment: 'node-cjs', code }));
  child.stdin.end();
};

module.exports = jsEvalPlugin;
