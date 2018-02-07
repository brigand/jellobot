const { types: t } = require('babel-core');
const { default: generate } = require('babel-generator');
const { default: traverse } = require('babel-traverse');

const IDENT = '__jelloTrack';

const getLocStr = (node, wrap = false) => {
  const { loc: { start, end } } = node;
  const str = `${start.line}:${start.column}-${end.line}:${end.column}`;
  return wrap ? t.stringLiteral(str) : str;
};

const preamble = `
function ${IDENT}(range, value) {
  console.log('%%%%%' + range + '%%%%%' + require('object-inspect')(value) + '%%%%%');
  return value;
}
`.trim();

const annotateCode = (ast) => {
  const enter = (path) => {
    if (path.node.jelloVisited) {
      path.skip();
      path.traverse({ enter });
      return;
    }
    // eslint-disable-next-line
    path.node.jelloVisited = true;

    if (path.isCallExpression()) {
      const wrapper = t.callExpression(
        t.identifier(IDENT),
        [
          getLocStr(path.node, true),
          path.node,
        ],
      );

      wrapper.jelloVisited = true;

      path.replaceWith(wrapper);
    }
    if (path.isVariableDeclarator()) {
      const after = t.callExpression(
        t.identifier(IDENT),
        [
          getLocStr(path.node, true),
          t.identifier(path.node.id.name),
        ],
      );
      after.jelloVisited = true;
      path.parentPath.insertAfter(t.expressionStatement(after), path);
    }
  };

  traverse(ast, {
    enter,
  });

  return `${preamble}\n${generate(ast).code}`;
};

module.exports = annotateCode;
