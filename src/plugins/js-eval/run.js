const { Script, SourceTextModule, createContext } = require('vm');
const util = require('util');
const builtinModules = require('module').builtinModules.filter(
  (a) => !/^_|\//.test(a),
);

// copied from https://github.com/devsnek/docker-js-eval/run.js

class TweakedBoolean {
  constructor(value) {
    this.value = value;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    const str = this.value ? 'yea' : 'nop';
    return this.value instanceof Boolean ? `[Boolean ${str}]` : str;
  }
}

function tweakBooleans(obj, visited = new Set()) {
  if (obj == null) return obj;
  if (typeof obj === 'boolean' || obj instanceof Boolean) return new TweakedBoolean(obj);
  if (visited.has(obj)) return obj; // return to escape recursive objects
  const newVisited = new Set(visited);
  newVisited.add(obj);
  for (const k of Object.keys(obj)) {
    obj[k] = tweakBooleans(obj[k], newVisited);
  }
  return obj;
}

const inspect = (val) => {
  try {
    return util.inspect(tweakBooleans(val), {
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
  switch (environment) {
    case 'node-cjs': {
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
      module.instantiate();
      const { result } = await module.evaluate({ timeout });
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
      } = require('engine262');

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
