const { exec } = require('child_process');

const jsEvalPlugin = ({ mentionUser, respond, respondWithMention, message }) => {
  if (!message.startsWith('n>')) return;
  const code = message.slice(2);

  const respondWith = mentionUser ? respondWithMention : respond;

  const child = exec('docker run --rm -i devsnek/js-eval', { timeout: 5000 }, (err, stdout = '') => {
    if (err && err.killed) return respondWith('Timeout');

    return respondWith(stdout.trim());
  });

  child.stdin.write(JSON.stringify({ environment: 'node-cjs', code }));
  child.stdin.end();
};

module.exports = jsEvalPlugin;
