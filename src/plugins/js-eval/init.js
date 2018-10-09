const { exec } = require('child_process');

async function initJsEval() {
  // Kill all docker containers created with "--name jseval-{some hex string}"
  exec(`docker rm -f $(docker ps -qf name=jseval-)`, (err, stdout = '') => {
    const nKilled = stdout.trim().split('\n').length;
    if (nKilled) {
      console.log(`Killed ${nKilled} containers.`);
    }
  }
}

module.exports = initJsEval;
