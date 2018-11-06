const cp = require('child_process');
const fetch = require('node-fetch');

const exec = cmd => new Promise((res, rej) => cp.exec(cmd, (err, stdout) => err ? rej(err) : res(stdout.trim())));

async function initJsEval() {
  // Kill all docker containers created with "--name jseval-{some hex string}"
  const stdout = await exec(`docker rm -f $(docker ps -aqf name=jseval-)`).catch(() => ''); // ignore if no images
  if (stdout) console.log(`Killed ${stdout.split('\n').length} containers.`);

  // get latest node11 version, if GH_TOKEN provided (easy to get one at https://github.com/settings/tokens)
  let nodeVersion = '11.1.0'; // by default
  if (process.env.GH_TOKEN) {
    nodeVersion = await fetch(
      'https://api.github.com/repos/nodejs/node/tags?per_page=1',
      { headers: { 'user-agent': 'Lol', Authorization: 'bearer ' + process.env.GH_TOKEN } }
    ).then(r => r.json()).then(d => d[0].name.slice(1));
  }

  // Build image
  console.log('Building image ...');
  await exec(`docker build -t brigand/js-eval --build-arg NODE_VERSION=${nodeVersion} . -f src/plugins/js-eval/Dockerfile`);
  const builtNodeVersion = await exec('docker run --rm brigand/js-eval node -v');
  const meta = JSON.parse(await exec(`docker images brigand/js-eval:latest --format '{{json .}}'`));

  console.log(`Built brigand/js-eval`);
  console.log(`Node Version: ${builtNodeVersion}, Size: ${meta.Size}, Since: ${meta.CreatedSince}`);
}

module.exports = initJsEval;

if (!module.parent) initJsEval().catch(console.error);
