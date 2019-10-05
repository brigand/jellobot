async function init() {
  for (const dir of ['js-eval', 'rng', 'factoids', 'mdn', 'npm']) {
    // eslint-disable-next-line
    await tryInit(dir);
  }
}

function tryRequire(path) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(path);
  } catch (e) {
    return null;
  }
}

async function tryInit(dir) {
  const initImpl = tryRequire(`./${dir}/init.js`);

  if (!initImpl) {
    return;
  }

  try {
    await initImpl();
    console.error(`Plugin ${dir} initialized`);
  } catch (e) {
    throw new Error(`Failed to initialize plugins/${dir}`);
  }
}

module.exports = init;
