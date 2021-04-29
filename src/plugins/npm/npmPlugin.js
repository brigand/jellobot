const cp = require('child_process');
const util = require('util');
const { messageToFactoid } = require('../factoids/factoidsPlugin');

const exec = util.promisify(cp.exec);

const npmPlugin = async (msg) => {
  if (!msg.command) return;

  const words = msg.command.command.split(' ');
  if (words[0] !== 'npm') {
    return;
  }
  const factoid = await messageToFactoid(msg);
  if (factoid) {
    return;
  }

  const name = words[1];
  if (!name) {
    return;
  }

  msg.handling();

  if (!/^[a-zA-Z0-9_.-]{3,}$/.test(name)) {
    msg.respondWithMention(`that doesn't look like a valid package name`);
    return;
  }

  let stdout;
  let stderr;
  try {
    ({ stdout, stderr } = await exec(`npm info "${name}" --json`));
    const data = JSON.parse(stdout);

    msg.respondWithMention(
      `${name}@${data.version}: ${
        data.description ? data.description.slice(0, 100) : '(no description)'
      } - https://www.npmjs.com/package/${name}`,
    );
  } catch (e) {
    msg.respondWithMention(`Failed to look up package`);
    console.error(`stdout`, stdout, `stderr`, stderr);
  }
};

module.exports = npmPlugin;
