const { Parser, tokTypes: tt } = require('acorn');
const walk = require('acorn-walk');
const recast = require('recast');

function parseSliceExpressionPlugin(Parser) {
  return class extends Parser {
    // Parse a slice (`start:end:step`) operator.
    parseMaybeSlice(noIn, refDestructuringErrors) {
      let startPos = this.start, startLoc = this.startLoc
      let startIndex, endIndex, step; // can't name them 'start', 'end' because those are Parser properties
      if (!this.eat(tt.colon)) {
        startIndex = this.parseMaybeConditional(noIn, refDestructuringErrors);

        if (this.type !== tt.colon) return startIndex;

        this.eat(tt.colon);
      }

      //now we're sure to be in a slice operator, we've already parsed (start):

      let hasSecondColon = this.eat(tt.colon);

      if (!hasSecondColon && this.type !== tt.bracketR) {
        endIndex = this.parseMaybeConditional(noIn, refDestructuringErrors);

        hasSecondColon = this.eat(tt.colon);
      }

      // we're after end, (start):(end)(:(step)) and parse a possible step expression
      //                                 ^

      if (hasSecondColon && this.type !== tt.bracketR) {
        step = this.parseMaybeConditional(noIn, refDestructuringErrors);
      }

      let node = this.startNodeAt(startPos, startLoc)
      node.startIndex = startIndex;
      node.endIndex = endIndex;
      node.step = step;
      return this.finishNode(node, "SliceExpression")
    }

    // copy-paste of original parseMaybeAssign except this.parseMaybeSlice instead of this.parseMaybeConditional
    parseMaybeAssign(noIn, refDestructuringErrors, afterLeftParse) {
      if (this.isContextual("yield")) {
        if (this.inGenerator) return this.parseYield(noIn)
        // The tokenizer will assume an expression is allowed after
        // `yield`, but this isn't that kind of yield
        else this.exprAllowed = false
      }

      let ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldShorthandAssign = -1
      if (refDestructuringErrors) {
        oldParenAssign = refDestructuringErrors.parenthesizedAssign
        oldTrailingComma = refDestructuringErrors.trailingComma
        oldShorthandAssign = refDestructuringErrors.shorthandAssign
        refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.shorthandAssign = -1
      } else {
        refDestructuringErrors = new Error()
        ownDestructuringErrors = true
      }

      let startPos = this.start, startLoc = this.startLoc
      if (this.type === tt.parenL || this.type === tt.name)
        this.potentialArrowAt = this.start
      let left = this.parseMaybeSlice(noIn, refDestructuringErrors)
      if (afterLeftParse) left = afterLeftParse.call(this, left, startPos, startLoc)
      if (this.type.isAssign) {
        let node = this.startNodeAt(startPos, startLoc)
        node.operator = this.value
        node.left = this.type === tt.eq ? this.toAssignable(left, false, refDestructuringErrors) : left
        if (!ownDestructuringErrors) DestructuringErrors.call(refDestructuringErrors)
        refDestructuringErrors.shorthandAssign = -1 // reset because shorthand default was used correctly
        this.checkLVal(left)
        this.next()
        node.right = this.parseMaybeAssign(noIn)
        return this.finishNode(node, "AssignmentExpression")
      } else {
        if (ownDestructuringErrors) this.checkExpressionErrors(refDestructuringErrors, true)
      }
      if (oldParenAssign > -1) refDestructuringErrors.parenthesizedAssign = oldParenAssign
      if (oldTrailingComma > -1) refDestructuringErrors.trailingComma = oldTrailingComma
      if (oldShorthandAssign > -1) refDestructuringErrors.shorthandAssign = oldShorthandAssign
      return left
    }
  }
}

const ParserWithSE = Parser.extend(
  parseSliceExpressionPlugin
)

const base = {
  SliceExpression(node, state, c) {
    if (node.startIndex) c(node.startIndex, state, "Expression")
    if (node.endIndex) c(node.endIndex, state, "Expression")
    if (node.step) c(node.step, state, "Expression")
  }
};

for (const [type, fn] of [...Object.entries(walk.base), ...Object.entries(base)]) {
  base[type] = (node, ancestors, c) => {
    fn(node, ancestors[0] === node ? [...ancestors] : [node, ...ancestors], c);
  };
}

const __sliceStr = `Object.prototype.__slice = function (si = 0, ei = this.length, step = 1) {
  if (si < 0) si = Math.max(si + this.length, 0);
  if (ei < 0) ei = Math.max(ei + this.length, 0);
  si = Math.min(si, this.length);
  ei = Math.min(ei, this.length);
  const a = [];
  if (step < 0) for (let i = ei + step; i >= si; i += step) a.push(this[i]);
  else for (let i = si; i < ei; i += step) a.push(this[i]);
  return this instanceof String ? a.join('') : a;
};`;

function replaceNode(parent, node, newNode) {
  // locate node
  let target, key;
  for (const [k, v] of Object.entries(parent)) {
    if (!v || typeof v !== 'object') continue;
    if (Array.isArray(v) && v.includes(node)) {
      target = v;
      key = v.indexOf(node);
      break;
    } else if (!Array.isArray(v) && v === node) {
      target = parent;
      key = k;
      break;
    }
  }
  target[key] = newNode;
}

module.exports = function processSliceExpression(source) {
  const root = ParserWithSE.parse(source);
  let need__slice;

  walk.recursive(root, [], {
    SliceExpression: (node, ancestors, c) => {
      // don't use eval outside a sandboxed env or a local env where you know what you're doing
      let si = node.startIndex
        ? node.startIndex.value !== undefined ? node.startIndex.value : eval(source.slice(node.startIndex.start, node.startIndex.end))
        : undefined;

      let ei = node.endIndex
        ? node.endIndex.value !== undefined ? node.endIndex.value : eval(source.slice(node.endIndex.start, node.endIndex.end))
        : undefined;

      let step = node.step
        ? node.step.value !== undefined ? node.step.value : eval(source.slice(node.step.start, node.step.end))
        : undefined;

      // get closest MemberExpression,
      const me = ancestors.find(n => n.type === 'MemberExpression');

      if (me) { // we're in a arr[start:end:step] case, we'll transform this expression
        if (me.property !== node) throw new Error('this scenario should not happen');
        const expr = {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: me.object,
            property: { type: 'Identifier', name: '__slice' }
          },
          arguments: [{ type: 'Literal', value: si }, { type: 'Literal', value: ei }, { type: 'Literal', value: step }]
        }
        const meParent = ancestors[ancestors.indexOf(me) + 1];
        if (!meParent) throw new Error('no parent, cannot replace node');

        replaceNode(meParent, me, expr);
        need__slice = true;
      } else {
        const expr = {
          type: 'CallExpression',
          callee: {
            type: 'FunctionExpression',
            expression: false,
            generator: true,
            params: [],
            body: {
              type: 'BlockStatement',
              body: [{
                type: 'ForStatement',
                init: {
                  type: 'VariableDeclaration',
                  declarations: [{
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: 'i' },
                    init: step < 0 ? { type: 'Literal', value: ei + step } : { type: 'Literal', value: si }
                  }],
                  kind: 'let'
                },
                test: {
                  type: 'BinaryExpression',
                  operator: step < 0 ? '>=' : '<',
                  left: { type: 'Identifier', name: 'i' },
                  right: step < 0 ? { type: 'Literal', value: si } : { type: 'Literal', value: ei },
                },
                update: {
                  type: 'AssignmentExpression',
                  operator: '+=',
                  left: { type: 'Identifier', name: 'i' },
                  right: { type: 'Literal', value: step },
                },
                body: {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'YieldExpression',
                    delegate: false,
                    argument: {
                      type: 'Identifier',
                      name: 'i'
                    },
                  }
                }
              }]
            }
          },
          arguments: []
        };

        replaceNode(ancestors[1], node, expr);
      }
      base.SliceExpression(node, ancestors, c);
    }
  }, base);

  return (need__slice ? __sliceStr : '') + recast.print(root).code;
}