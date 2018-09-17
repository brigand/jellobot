const { exec } = require('child_process');
const evalUtils = require('./evalUtils');

const tryParse = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

async function initJsEval() {
  // Kill all docker containers created with "--name jseval-{some hex string}"
  exec(`docker ps --format '{{ json . }}'`, { encoding: 'utf-8'}, (err, stdout = '') => {
    const containers = stdout.split(/[\r\n]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(tryParse)
      .filter(Boolean);

    const evalContainers = containers.filter(x => evalUtils.names.test(x.Names));
    if (!evalContainers.length) {
      return;
    }

    console.log(`There were ${evalContainers.length} containers still running when the bot started. Killing.`);
    evalContainers.forEach((cont) => {
      exec(`docker kill "${cont.ID}"`, { encoding: 'utf-8' }, (killErr, killStdout) => {
        if (killErr) {
          console.error(`Failed to kill container`, cont);
          console.error(' ', killErr.message);
          console.error(killStdout.trim() + '\n\n');
          return;
        }

        console.error(`Killed container ${cont.ID} / ${cont.Names}`);
      });
    });
  });
}

module.exports = initJsEval;
