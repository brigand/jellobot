const { Script, SourceTextModule, createContext } = require('vm');
const util = require('util');
const builtinModules = require('module').builtinModules.filter(
  (a) => !/^_|\//.test(a),
);

// copied from https://github.com/devsnek/docker-js-eval/run.js

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

const run = async (code, environment, timeout) => {
  if (environment === 'node-cjs') {
    const script = new Script(code);
    global.module = module;
    global.require = require;
    global.exports = exports;
    global.__dirname = __dirname;
    global.__filename = __filename;
    for (const name of builtinModules) {
      const setReal = (val) => {
        delete global[name];
        global[name] = val;
      };
      Object.defineProperty(global, name, {
        get: () => {
          const lib = require(name); // eslint-disable-line
          delete global[name];
          Object.defineProperty(global, name, {
            get: () => lib,
            set: setReal,
            configurable: true,
            enumerable: false,
          });
          return lib;
        },
        set: setReal,
        configurable: true,
        enumerable: false,
      });
    }
    return script.runInThisContext({
      timeout,
      displayErrors: true,
    });
  }
  if (environment === 'module') {
    const module = new SourceTextModule(code, {
      context: createContext(Object.create(null)),
    });
    await module.link(async () => {
      throw new Error('Unable to resolve import');
    });
    module.instantiate();
    const { result } = await module.evaluate({ timeout });
    return result;
  }
  if (environment === 'script') {
    const script = new Script(code, {
      displayErrors: true,
    });
    return script.runInContext(createContext(Object.create(null)), {
      timeout,
      displayErrors: true,
    });
  }
  if (environment === 'engine262') {
    const { Agent, ManagedRealm, Value, CreateDataProperty, FEATURES, setSurroundingAgent, inspect: _inspect } = require('engine262');

    const agent = new Agent({
      features: FEATURES.map((o) => o.name),
    });
    setSurroundingAgent(agent);

    const realm = new ManagedRealm();

    return new Promise((resolve, reject) => {
      realm.scope(() => {
        // const print = new Value((args) => {
        //   console.log(...args.map((tmp) => _inspect(tmp)));
        //   return Value.undefined;
        // });
        // CreateDataProperty(realm.GlobalObject, new Value('print'), print);

        const completion = realm.evaluateScript(code);
        if (completion.Type === 'throw') {
          reject(_inspect(completion.Value));
        } else {
          resolve(_inspect(completion.Value));
        }
      });
    });
  }

  throw new RangeError(`Invalid environment: ${environment}`);
};

if (!module.parent) {
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
      const result = await run(
        code,
        process.env.JSEVAL_ENV,
        Number.parseInt(process.env.JSEVAL_TIMEOUT, 10) || undefined,
      );
      process.stdout.write(inspect(result));
    } catch (error) {
      process.stdout.write(
        error instanceof Error ? `${error.name}: ${error.message}` : `${error}`,
      );
      process.exit(1);
    }
  })();
}
