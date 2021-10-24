const { Script, SourceTextModule, createContext } = require('vm');
const util = require('util');
const builtinModules = require('module').builtinModules.filter(
  (s) => !/^_|\//.test(s),
);
const { setTimeout } = require('timers/promises');

// code taken from https://github.com/devsnek/docker-js-eval/run.js

const inspect = (val) => {
  try {
    return util.inspect(val, {
      maxArrayLength: 20,
      breakLength: Infinity,
      colors: false,
      compact: true,
      depth: 10,
    });
  } catch {
    return '';
  }
};

function exposeBuiltinInGlobal(name) {
  const setReal = (val) => {
    delete global[name];
    global[name] = val;
  };
  Object.defineProperty(global, name, {
    get: () => {
      const value = require(name); // eslint-disable-line
      if (name === 'timers') {
        value.promises = value.promises || require('timers/promises'); // eslint-disable-line
      }
      delete global[name];
      Object.defineProperty(global, name, {
        get: () => value,
        set: setReal,
        configurable: true,
        enumerable: false,
      });
      return value;
    },
    set: setReal,
    configurable: true,
    enumerable: false,
  });
}

async function run(code, environment, timeout) {
  switch (environment) {
    case 'node-cjs': {
     if (process.env.JSEVAL_MODE === 'b') {
        require('@bloomberg/record-tuple-polyfill');
      }
      const script = new Script(code);
      global.module = module;
      global.require = require;
      global.exports = exports;
      global.__dirname = __dirname;
      global.__filename = __filename;
      builtinModules.forEach(exposeBuiltinInGlobal);
      const result = await script.runInThisContext({
        timeout,
        displayErrors: true,
      });
      return inspect(result);
    }

    case 'module': {
      const module = new SourceTextModule(code, {
        context: createContext(Object.create(null)),
      });
      await module.link(async () => {
        throw new Error('Unable to resolve import');
      });

      const timeoutCtrl = new AbortController();
      const result = await Promise.race([
        module.evaluate({ timeout }).finally(() => timeoutCtrl.abort()),
        setTimeout(Math.floor(timeout * 1.5), timeoutCtrl).then(() => {
          throw new Error('The execution timed out');
        }),
      ]);

      return inspect(result);
    }

    case 'script': {
      const script = new Script(code, {
        displayErrors: true,
      });
      const result = await script.runInContext(createContext(Object.create(null)), {
        timeout,
        displayErrors: true,
      });
      return inspect(result);
    }

    case 'engine262': {
      const {
        Agent,
        ManagedRealm,
        Value,
        CreateDataProperty,
        FEATURES,
        setSurroundingAgent,
        inspect: _inspect,
      } = require('engine262'); // eslint-disable-line

      const agent = new Agent({
        features: FEATURES.map((o) => o.name),
      });
      setSurroundingAgent(agent);

      const realm = new ManagedRealm();

      return new Promise((resolve, reject) => {
        realm.scope(() => {
          const print = new Value((args) => {
            console.log(...args.map((tmp) => _inspect(tmp)));
            return Value.undefined;
          });
          CreateDataProperty(realm.GlobalObject, new Value('print'), print);

          const completion = realm.evaluateScript(code);
          if (completion.Type === 'throw') {
            reject(_inspect(completion.Value));
          } else {
            resolve(_inspect(completion.Value));
          }
        });
      });
    }

    default:
      throw new RangeError(`Invalid environment: ${environment}`);
  }
}

if (require.main === module) {
  (async () => {
    let code = process.argv[2];
    if (!code) {
      // if no argument, read from stdin
      code = '';
      for await (const chunk of process.stdin) {
        code += chunk;
      }
    }
    try {
      const output = await run(
        code,
        process.env.JSEVAL_ENV,
        Number.parseInt(process.env.JSEVAL_TIMEOUT, 10) || undefined,
      );
      process.stdout.write('⬊ ');
      process.stdout.write(output);
    } catch (error) {
      process.stdout.write(
        error instanceof Error ? `${error.name}: ${error.message}` : `${error}`,
      );
      process.exit(1);
    }
  })();
}
