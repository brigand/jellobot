const babelParser = require('@babel/parser');
const recast = require('recast');

const b = recast.types.builders;

function processTopLevelAwait(src) {
  let root;

  try {
    root = recast.parse(src, {
      parser: {
        parse(src) {
          return babelParser.parse(src, { allowAwaitOutsideFunction: true });
        }
      }
    });
  } catch {
    return null; // if code is not valid, don't bother
  }

  let containsAwait = false;
  let containsReturn = false;

  recast.visit(root, {
    visitNode: function (path) {
      const node = path.value;

      switch (node.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
        case 'MethodDefinition':
          // stop when entering a new function scope:
          return false;

        case 'ForOfStatement':
          if (node.await === true) {
            containsAwait = true;
          }
          return this.traverse(path);

        case 'AwaitExpression':
          containsAwait = true;
          return this.traverse(path);

        case 'ReturnStatement':
          containsReturn = true;
          return this.traverse(path);

        default:
          return this.traverse(path);
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
  root.program.body[root.program.body.length - 1] = b.returnStatement(last);

  const iiafe = b.callExpression(
    b.arrowFunctionExpression(
      [],
      b.blockStatement(root.program.body),
      true
    ),
    []
  );

  iiafe.callee.async = true;

  return recast.print(iiafe).code;
}

module.exports = processTopLevelAwait;
