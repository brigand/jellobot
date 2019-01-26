const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const npm = require('global-npm');
const semver = require('semver');
const webpack = require('webpack');
const { traverse, parse } = require('@babel/core');

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const moduleDir = path.resolve(__dirname, '/../../../npm_cache');

// load npm

let npmInstall;
let npmView;
npm.load({loglevel: 'silent', lock: false}, (err) => {
  if (err) {
    console.error(err);
  } else {
    npmInstall = promisify(npm.commands.install);
    npmView = promisify(npm.commands.view);
    // disable an attack vector
    npm.config.set('ignore-scripts', true);
  }
});

function extractRequires(code) {
  const requires = [];
  traverse(parse(code), {
    enter(nodePath) {
      if (nodePath.isIdentifier({ name: 'require' })
        && nodePath.container
        && nodePath.container.type === 'CallExpression'
        && nodePath.container.arguments.length > 0) {
        if (nodePath.container.arguments[0].type === 'StringLiteral') {
          const { value, extra } = nodePath.container.arguments[0];
          const { raw } = extra;
          requires.push({ value, raw });
        } else {
          throw new Error('First argument must be a string literal');
        }
      }
    }
  });
  return requires;
}

function fetchPackage(pkgName) {
  if (
    !pkgName.length
      || pkgName.startsWith('.')
      || pkgName.startsWith('_')
      || /[~()'!*]/.test(pkgName)
      || pkgName.includes('..')
  ) {
    throw new Error('Invalid package name');
  }
  const hasVersion = pkgName.indexOf('@') > 0;
  const version = hasVersion ? pkgName.replace(/^(.+?)@/, '') : 'latest';
  const name = (hasVersion ? pkgName.replace(/@(.*?)$/, '') : pkgName).replace(/\//g, '#');
  const [nameRaw, ...pathRaw] = name.split('#');
  const subPath = pathRaw.join('/');
  const moduleRaw = `${nameRaw}@${version}`;
  const module = `${name}@${version}`;

  return new Promise(async (resolve, reject) => {
    try {
      // create cache dir if it doesn't exist
      if (!await existsAsync(moduleDir)) {
        await mkdirAsync(moduleDir);
      }
      if (!npmView) {
        return reject(new Error('npm module not loaded'));
      }
      if (version === 'newest') {
        // check latest on npm and see if we have it
        const info = await npmView([nameRaw], true);
        const latest = Object.keys(info)[0];
        const filename = path.resolve(moduleDir, `${name}@${latest}.js`);
        if (await existsAsync(filename)) {
          return resolve(await readFileAsync(filename));
        }
      } else if (version === 'latest') {
        // grab the newest version from the cache
        const cacheList = (await readdirAsync(moduleDir))
          .filter(fn => fn.startsWith(`${name}@`))
          .sort((a, b) => {
            const aVer = a.replace(/^.*@|\.js$/g, '');
            const bVer = b.replace(/^.*@|\.js$/g, '');
            if (!semver.valid(aVer) || !semver.valid(bVer)) {
              return -1;
            }
            return semver.lt(aVer, bVer);
          });
        if (typeof cacheList[0] === 'string') {
          const filename = path.resolve(moduleDir, cacheList[0]);
          if (await existsAsync(filename)) {
            return resolve(await readFileAsync(filename));
          }
        }
      } else {
        // check if we have the specific version
        const filename = path.resolve(moduleDir, module + '.js');
        if (await existsAsync(filename)) {
          return resolve(await readFileAsync(filename));
        }
      }

      // install a freshy
      const result = await npmInstall(moduleDir, [moduleRaw]);
      const resultVersion = result[0][0].replace(/^(.*?)@/, '');
      const bundlename = `${name}@${resultVersion}.js`;
      const modulePath = path.resolve(moduleDir, 'node_modules', nameRaw);
      const packagePath = path.resolve(modulePath, 'package.json');
      if (!await existsAsync(packagePath)) {
        return reject(new Error(`package.json not found`));
      }
      const pkg = await readFileAsync(packagePath);
      const pkgJson = JSON.parse(pkg.toString());
      const entrypoint = pkgJson.main || 'index.js';
      const rootScript = require.resolve(
        modulePath + (subPath.length ? '/' + subPath : '/' + entrypoint),
      );
      if (!await existsAsync(rootScript)) {
        return reject(new Error(`missing entrypoint file`));
      }

      // attempt to bundle module
      webpack({
        target: 'webworker',
        entry: rootScript,
        output: {
          path: path.resolve(moduleDir),
          filename: bundlename,
          library: '__jello__',
        },
        mode: 'development',
        resolve: {
          modules: [moduleDir, 'node_modules'],
        },
        node: {
          fs: 'empty',
          net: 'empty',
          child_process: 'empty',
          path: 'empty',
          tls: 'empty',
        },
      }).run(async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            const filename = path.resolve(moduleDir, bundlename);
            if (!await existsAsync(filename)) {
              reject(new Error(`${bundlename} not found`));
            } else {
              resolve(await readFileAsync(filename));
            }
          } catch (e) {
            reject(e);
          }
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

const npmRequire = (code) => new Promise(async (res, rej) => {
  try {
    const requires = extractRequires(code);
    const result = await Promise.all(
      requires.map(({value}) => fetchPackage(value))
    );

    const modules = result.map((source, index) => `
      modules[${requires[index].raw}] = (function() {
        ${source}
        return __jello__;
      })();
    `);

    const prelude = `
      (function() {
        const modules = {};
        ${modules}
        global.require = (name) => modules[name];
      })();
    `;

    res(prelude + code);
  } catch (err) {
    rej(err);
  }
});

module.exports = npmRequire;
