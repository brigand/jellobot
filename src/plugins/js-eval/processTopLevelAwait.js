const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babelGenerator = require('@babel/generator').default;

const babelParseOpts = {
  allowAwaitOutsideFunction: true,
  plugins: [
    'throwExpressions',
    'bigInt',
    ['decorators', { decoratorsBeforeExport: true }],
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'doExpressions',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'functionBind',
    'functionSent',
    'importMeta',
    'logicalAssignment',
    'nullishCoalescingOperator',
    'numericSeparator',
    // 'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'partialApplication',
    ['pipelineOperator', { proposal: 'minimal' }],
    'throwExpressions'
  ]
};


function processTopLevelAwait(src) {
  let root;

  try {
    root = babelParser.parse(src, babelParseOpts);
  } catch (error) {
    return null; // if code is not valid, don't bother
  }

  let containsAwait = false;
  let containsReturn = false;

  babelTraverse(root, {
    enter(path) {
      switch (path.type) {
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
        case 'MethodDefinition':
        case 'ClassMethod':
          // stop when entering a new function scope:
          return path.stop();

        case 'ForOfStatement':
          if (path.node.await === true) {
            containsAwait = true;
          }
          return;

        case 'AwaitExpression':
          containsAwait = true;
          return;

        case 'ReturnStatement':
          containsReturn = true;
          return;
      }
    }
  });

  // Do not transform if
  // 1. False alarm: there isn't actually an await expression.
  // 2. There is a top-level return, which is not allowed.
  if (!containsAwait || containsReturn) {
    return null;
  }

  let last = root.program.body[root.program.body.length - 1];
  if (last.type === 'ExpressionStatement') {
    last = last.expression;
  }

  // replace last node with a returnStatement of this node
  root.program.body[root.program.body.length - 1] = {
    type: 'ReturnStatement',
    argument: last
  };

  const iiafe = {
    type: 'CallExpression',
    callee: {
      type: 'ArrowFunctionExpression',
      async: true,
      params: [],
      body: {
        type: 'BlockStatement',
        body: root.program.body
      },
    },
    arguments: []
  };

  return babelGenerator(iiafe).code;
}

module.exports = processTopLevelAwait;
