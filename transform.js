var assert = require('assert');

var compileLiteral = function (tree) {
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

var compileObjectExpression_propertyValue = function (tree) {

  switch (tree.type) {
    case 'Literal': return compileLiteral(tree);
    case 'ObjectExpression': return compileObjectExpression(tree);
    case 'ArrayExpression': return compileArrayExpression(tree);
    default: throw new Error('Unexpected property value type ' + tree.type);
  }

};

var compileObjectExpression = function (tree) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.properties.map(function (property) {
      switch (property.key.type) {
        case 'Identifier':
          return {
            type: 'TableKeyString',
            key: property.key,
            value: compileObjectExpression_propertyValue(property.value)
          }
        case 'Literal':
          return {
            type: 'TableKey',
            key: compileLiteral(property.key),
            value: compileObjectExpression_propertyValue(property.value)
          }
        default: throw new Error('Unexpected property key type ' + property.key.type);
      }
    })
  };

};

var compileArrayExpression_element = function (tree) {

  switch (tree.type) {
    case 'Literal': return compileLiteral(tree);
    default: throw new Error('Unexpected array element type ' + tree.type);
  }

};

var compileArrayExpression = function (tree) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.elements.map(function (element) {
      return {
        type: 'TableValue',
        value: compileArrayExpression_element(element)
      }
    })
  };

};

var compileVariableDeclarator_var = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  if (tree.id.type !== 'Identifier') {
    throw new Error('Variable ID type has to be Identifier');
  }

  return {
    type: 'Identifier',
    name: tree.id.name
  };

};

var compileVariableDeclarator_init = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  if (tree.init) {
    switch (tree.init.type) {
      case 'Literal': return compileLiteral(tree.init);
      case 'BinaryExpression': return compileBinaryExpression(tree.init);
      case 'UnaryExpression': return compileUnaryExpression(tree.init);
      case 'ObjectExpression': return compileObjectExpression(tree.init);
      case 'ArrayExpression': return compileArrayExpression(tree.init);
      default: throw new Error('Unexpected init ' + tree.init.type);
    }
  } else {
    return {
      type: 'NilLiteral',
      value: null,
      raw: 'nil'
    };
  }

};

var compileVariableDeclaration = function (tree) {
  assert.strictEqual(tree.type, 'VariableDeclaration');

  var out =  {
    type: 'LocalStatement',
    variables: tree.declarations.map(compileVariableDeclarator_var),
    init: tree.declarations.reduceRight(function (arr, tree) {
      if (!arr.length || !arr[arr.length - 1]) {
        return tree.init ? [compileVariableDeclarator_init(tree)] : [];
      }
      arr.unshift(compileVariableDeclarator_init(tree));
      return arr;
    }, [])
  };

  return out;

};

var compileBlockStatement = function (tree) {
  assert.strictEqual(tree.type, 'BlockStatement');

  return {
    type: 'Chunk',
    body: tree.body.map(function (child) {
      switch (child.type) {
        case 'VariableDeclaration': return compileVariableDeclaration(child);
        case 'ExpressionStatement': return compileExpressionStatement(child);
        default: throw new Error('Unexpected child ' + child.type);
      }
    })
  };

};

var compileFunctionDeclaration = function (tree) {
  assert.strictEqual(tree.type, 'FunctionDeclaration');

  return compileBlockStatement(tree.body);

};

var compileProgram = function (tree) {
  assert.strictEqual(tree.type, 'Program');

  if (tree.body.length !== 1 || tree.body[0].type !== 'FunctionDeclaration') {
    throw new Error('Program must contain a single top-level function');
  }

  return compileFunctionDeclaration(tree.body[0]); 

};

module.exports = compileProgram;
