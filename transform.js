var assert = require('assert');

var t = {};

var sub = function (tree, whitelist) {
  if (whitelist.indexOf(tree.type) >= 0) {
    return t[tree.type](tree);
  }
  throw new Error('Unexpected subtree type ' + tree.type);
};

t.Literal = function (tree) {
  assert.strictEqual(tree.type, 'Literal');

  var type;

  switch (typeof tree.value) {
    case 'number': type = 'NumericLiteral'; break;
    case 'string': type = 'StringLiteral'; break;
    default: throw new Error('Unexpected literal type ' + typeof tree.value);
  }

  return {
    type: type,
    value: tree.value,
    raw: tree.raw
  };

};

var _ObjectExpression_propertyValue = function (tree) {

  return sub(tree, ['Literal', 'ObjectExpression', 'ArrayExpression']);

};

t.ObjectExpression = function (tree) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.properties.map(function (property) {
      switch (property.key.type) {
        case 'Identifier':
          return {
            type: 'TableKeyString',
            key: property.key,
            value: _ObjectExpression_propertyValue(property.value)
          }
        case 'Literal':
          return {
            type: 'TableKey',
            key: t.Literal(property.key),
            value: _ObjectExpression_propertyValue(property.value)
          }
        default: throw new Error('Unexpected property key type ' + property.key.type);
      }
    })
  };

};

var _ArrayExpression_element = function (tree) {

  return sub(tree, ['Literal']);

};

t.ArrayExpression = function (tree) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.elements.map(function (element) {
      return {
        type: 'TableValue',
        value: _ArrayExpression_element(element)
      }
    })
  };

};

_VariableDeclarator_var = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  if (tree.id.type !== 'Identifier') {
    throw new Error('Variable ID type has to be Identifier');
  }

  return {
    type: 'Identifier',
    name: tree.id.name
  };

};

var _VariableDeclarator_init = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  if (tree.init) {
    return sub(tree.init, [
      'Literal',
      'BinaryExpression',
      'UnaryExpression',
      'ObjectExpression',
      'ArrayExpression'
    ]);
  } else {
    return {
      type: 'NilLiteral',
      value: null,
      raw: 'nil'
    };
  }

};

t.VariableDeclaration = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclaration');

  var out =  {
    type: 'LocalStatement',
    variables: tree.declarations.map(_VariableDeclarator_var),
    init: tree.declarations.reduceRight(function (arr, tree) {
      if (!arr.length || !arr[arr.length - 1]) {
        return tree.init ? [_VariableDeclarator_init(tree)] : [];
      }
      arr.unshift(_VariableDeclarator_init(tree));
      return arr;
    }, [])
  };

  return out;

};

t.MemberExpression = function (tree) {
  assert.strictEqual(tree.type, 'MemberExpression');

  var indexer;
  if (tree.computed === false) {
    indexer = '.';
  }

  return {
    type: 'MemberExpression',
    indexer: indexer,
    identifier: tree.property,
    base: tree.object
  };

};

var _CallExpression_base = function (tree) {

  return sub(tree, ['MemberExpression']);  

};

var _CallExpression_argument = function (tree) {

  return sub(tree, ['Literal', 'ObjectExpression', 'ArrayExpression']);

};

t.CallExpression = function (tree) {
  assert.strictEqual(tree.type, 'CallExpression');

  return {
    type: 'CallExpression',
    arguments: tree.arguments.map(_CallExpression_argument),
    base: _CallExpression_base(tree.callee)
  };

};

t.ExpressionStatement = function (tree) {
  assert.strictEqual(tree.type, 'ExpressionStatement');

  var expression;

  switch (tree.expression.type) {
    case 'CallExpression':
      return {
        type: 'CallStatement',
        expression: t.CallExpression(tree.expression)
      }
    default: throw new Error('Unexpected expression type ' + tree.expression.type);
  }

};

t.BlockStatement = function (tree) {
  assert.strictEqual(tree.type, 'BlockStatement');

  return {
    type: 'Chunk',
    body: tree.body.map(function (child) {
      return sub(child, ['VariableDeclaration', 'ExpressionStatement']);
    })
  };

};

t.FunctionDeclaration = function (tree) {
  assert.strictEqual(tree.type, 'FunctionDeclaration');

  return t.BlockStatement(tree.body);

};

t.Program = function (tree) {
  assert.strictEqual(tree.type, 'Program');

  if (tree.body.length !== 1 || tree.body[0].type !== 'FunctionDeclaration') {
    throw new Error('Program must contain a single top-level function');
  }

  return t.FunctionDeclaration(tree.body[0]); 

};

module.exports = t.Program;
