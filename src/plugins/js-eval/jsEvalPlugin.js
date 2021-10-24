const cp = require('child_process');
const crypto = require('crypto');
const babel = require('@babel/core');
const babelGenerator = require('@babel/generator').default;
const babelParser = require('@babel/parser');
const processTopLevelAwait = require('./processTopLevelAwait');
const { parserPlugins, transformPlugins } = require('./babelPlugins');

const helpMsg = `n> node stable, b> babel, s> node vm.Script, m> node vm.SourceTextModule, e> engine262`;

const timeoutMs = 5000;
const envs = {
  e: 'engine262',
  s: 'script',
  m: 'module',
  n: 'node-cjs',
  b: 'node-cjs',
};

module.exports = async function jsEvalPlugin({ mentionUser, respond, message, dockerCmd = 'docker', runFilePath = '/run/run.js' }) {
  const mode = message[0];

  if (message[1] !== '>') {
    return;
  }

  if (mode === '?') return respond((mentionUser ? `${mentionUser}, ` : '') + helpMsg);

  if (!envs[mode]) return;

  let code = message.slice(2);

  const hasMaybeTLA = /\bawait\b/.test(code);

  if (mode === 'b' || hasMaybeTLA) {
    // there's maybe a TLA await
    let ast = babelParser.parse(code, {
      allowAwaitOutsideFunction: true,
      ...(mode === 'b' && { plugins: parserPlugins }),
    });

    if (hasMaybeTLA) ast = processTopLevelAwait(ast);

    if (mode === 'b') {
      code = await babel
        .transformFromAstAsync(ast, code, {
          plugins: transformPlugins,
        })
        .then((r) => r.code);
    } else {
      code = babelGenerator(ast).code;
    }
  }

  try {
    const name = `jseval-${crypto.randomBytes(8).toString('hex')}`;
    const args = [
      'run',
      '-i',
      '--rm',
      `--name=${name}`,
      `--net=none`,
      `-eJSEVAL_MODE=${mode}`,
      `-eJSEVAL_ENV=${envs[mode]}`,
      `-eJSEVAL_TIMEOUT=${timeoutMs}`,
      'brigand/js-eval',
      'node',
      '--experimental-vm-modules', // used by m>
      '--experimental-modules',
      '--no-warnings',
      runFilePath,
    ];

    let timeout;
    let data = '';

    const result = await Promise.race([
      new Promise((resolve, reject) => {
        const proc = cp.spawn(dockerCmd, args);

        proc.stdin.write(code);
        proc.stdin.end();

        proc.stdout.on('data', (chunk) => {
          data += chunk;
        });

        proc.stderr.on('data', (chunk) => {
          data += chunk;
        });

        proc.on('error', reject);

        proc.on('exit', (status) => {
          if (status !== 0) {
            reject(new Error(data));
          } else {
            resolve(data.trim());
          }
        });
      }).finally(() => clearTimeout(timeout)),
      new Promise((resolve) => {
        timeout = setTimeout(resolve, timeoutMs + 10);
      }).then(() => {
        cp.execSync(`${dockerCmd} kill --signal=9 ${name}`);
        throw Object.assign(new Error(data), { reason: 'timeout' }); // send data received so far in the error msg
      }),
    ]);

    let clean = result.trim();

    clean = clean.replace(/(\S)\s*⬊ (undefined|null)$/, '$1');
    clean = clean.replace(/⬊\s*/, '');
    clean = clean.trim();

    respond((mentionUser ? `${mentionUser}, ` : '(okay) ') + clean);
  } catch (e) {
    let clean = e.message.trim();
    clean = clean.replace(/⬊\s*/, '');
    clean = clean.trim();

    respond((mentionUser ? `${mentionUser}, ` : `(${e.reason || 'fail'}) `) + clean); // Error message always start with Error:
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('exit', () => {
    const cmd = 'docker rm -f $(docker ps -qf name=jseval)';
    cp.exec(cmd, (err, stdout) => {
      console.error(`Command '${cmd}' finished with output`);
      console.error(stdout);
      console.error(`End of '${cmd}' output`);
    });
  });
}
