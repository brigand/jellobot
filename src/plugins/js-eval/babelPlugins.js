// all babel proposal plugins https://github.com/babel/babel/tree/master/packages (preset-stage-n packages are depreacted https://babeljs.io/docs/en/next/babel-preset-stage-1)
// if there are new ones, feel free to add them
// order maybe matters, not so sure
exports.transformPlugins = [
  '@babel/plugin-proposal-async-generator-functions',
  '@babel/plugin-transform-typescript',
  '@babel/plugin-transform-modules-commonjs', // required by dynamicImport
  ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: false }], // must be before class-properties https://babeljs.io/docs/en/babel-plugin-proposal-decorators#note-compatibility-with-babel-plugin-proposal-class-properties
  '@babel/plugin-proposal-class-properties',
  '@babel/plugin-proposal-class-static-block',
  '@babel/plugin-proposal-private-methods',
  '@babel/plugin-proposal-private-property-in-object',
  '@babel/plugin-proposal-do-expressions',
  '@babel/plugin-proposal-export-default-from',
  '@babel/plugin-proposal-export-namespace-from',
  '@babel/plugin-proposal-function-sent',
  '@babel/plugin-proposal-function-bind',
  '@babel/plugin-proposal-json-strings',
  '@babel/plugin-proposal-logical-assignment-operators',
  '@babel/plugin-proposal-nullish-coalescing-operator',
  '@babel/plugin-proposal-numeric-separator',
  '@babel/plugin-proposal-optional-catch-binding',
  '@babel/plugin-proposal-optional-chaining',
  '@babel/plugin-proposal-partial-application',
  ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
  '@babel/plugin-proposal-throw-expressions',
  '@babel/plugin-proposal-dynamic-import',
  '@babel/plugin-syntax-bigint',
  '@babel/plugin-syntax-import-meta',
  '@babel/plugin-proposal-unicode-property-regex',
  ['@babel/plugin-syntax-record-and-tuple', { syntaxType: 'hash' }],
];

// @babel/parser plugins https://babeljs.io/docs/en/babel-parser#ecmascript-proposalshttpsgithubcombabelproposals
exports.parserPlugins = [
  ['decorators', { decoratorsBeforeExport: true }],
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'classStaticBlock',
  'decimal',
  'doExpressions',
  'exportDefaultFrom',
  'functionBind',
  'functionSent',
  'partialApplication',
  ['pipelineOperator', { proposal: 'minimal' }],
  'privateIn',
  ['recordAndTuple', { syntaxType: 'hash' }],
  'throwExpressions',
];
