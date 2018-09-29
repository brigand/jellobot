const { exec } = require('child_process');

async function initJsEval() {
  // Kill all docker containers created with "--name jseval-{some hex string}"
  exec(`docker rm -f $(docker ps -qf name=jseval-) 2>/dev/null`, (err, stdout = '') => {

    console.log(`There were ${stdout.trim().split('\n').length} containers still running when the bot started. Killing them softly.`);
  });
}

module.exports = initJsEval;
