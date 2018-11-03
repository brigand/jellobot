const cp = require('child_process');

const exec = cmd => new Promise((res, rej) => cp.exec(cmd, (err, stdout) => err ? rej(err) : res(stdout.trim())));

async function initJsEval() {
  // Kill all docker containers created with "--name jseval-{some hex string}"
  const stdout = await exec(`docker rm -f $(docker ps -aqf name=jseval-)`).catch(() => ''); // ignore if no images
  if (stdout) console.log(`Killed ${stdout.split('\n').length} containers.`);
  // Build image
  console.log('Building image ...');
  await exec(`docker build -t brigand/js-eval . -f src/plugins/js-eval/Dockerfile`);
  const nodeVersion = await exec('docker run --rm brigand/js-eval node -v');
  const meta = JSON.parse(await exec(`docker images brigand/js-eval:latest --format '{{json .}}'`));

  console.log(`Built brigand/js-eval`);
  console.log(`Node Version: ${nodeVersion}, Size: ${meta.Size}, Since: ${meta.CreatedSince}`);
}

module.exports = initJsEval;

if (!module.parent) initJsEval().catch(console.error);
