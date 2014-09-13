var assert = require('assert'),
    scopup = require('scopup');

var t = {};

var sub = function (tree, vars, glob, whitelist) {
  if (!whitelist || whitelist.indexOf(tree.type) >= 0) {
    return t[tree.type](tree, vars, glob);
  }
  throw new Error('Unexpected subtree type ' + tree.type);
};

t.ThisExpression = function (tree, vars, glob) {
  assert(tree.type, 'ThisExpression');

  var node =  {
    type: 'Identifier',
    name: 'redis',
    isLocal: false
  };

  glob['redis'] = node;

  return node;

};

t.Literal = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'Literal');

  var type;

  switch (typeof tree.value) {
    case 'number': type = 'NumericLiteral'; break;
    case 'string': type = 'StringLiteral'; break;
    case 'boolean': type = 'BooleanLiteral'; break;
    default: throw new Error('Unexpected literal type ' + typeof tree.value);
  }

  return {
    type: type,
    value: tree.value,
    raw: tree.raw
  };

};

var _ObjectExpression_propertyValue = function (tree, vars, glob) {

  return sub(tree, vars, glob, [
    'Literal',
    'ObjectExpression',
    'ArrayExpression',
    'Identifier',
    'MemberExpression'
  ]);

};

t.Identifier = function (tree, vars, glob) {

  var node = {
    type: 'Identifier',
    name: tree.name,
    isLocal: vars.hasOwnProperty(tree.name)
  };

  if (!node.isLocal) {
    glob[node.name] = node;
  }


  return node;

};

t.ObjectExpression = function (tree, vars, glob) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.properties.map(function (property) {
      switch (property.key.type) {
        case 'Identifier':
          return {
            type: 'TableKeyString',
            key: property.key,
            value: _ObjectExpression_propertyValue(property.value, vars, glob)
          }
        case 'Literal':
          return {
            type: 'TableKey',
            key: t.Literal(property.key, vars, glob),
            value: _ObjectExpression_propertyValue(property.value, vars, glob)
          }
        default: throw new Error('Unexpected property key type ' + property.key.type);
      }
    })
  };

};

var _ArrayExpression_element = function (tree, vars, glob) {

  return sub(tree, vars, glob, ['Literal']);

};

t.ArrayExpression = function (tree, vars, glob) {

  return {
    type: 'TableConstructorExpression',
    fields: tree.elements.map(function (element) {
      return {
        type: 'TableValue',
        value: _ArrayExpression_element(element, vars, glob)
      }
    })
  };

};

_VariableDeclarator_var = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  return t.Identifier(tree.id, vars, glob);

};

var _VariableDeclarator_init = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'VariableDeclarator');

  if (tree.init) {
    return sub(tree.init, vars, glob, [
      'Literal',
      'BinaryExpression',
      'UnaryExpression',
      'ObjectExpression',
      'ArrayExpression',
      'MemberExpression',
      'CallExpression'
    ]);
  } else {
    return {
      type: 'NilLiteral',
      value: null,
      raw: 'nil'
    };
  }

};

t.VariableDeclaration = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'VariableDeclaration');

  var out =  {
    type: 'LocalStatement',
    variables: tree.declarations.map(function (declaration) {
      return _VariableDeclarator_var(declaration, vars, glob);
    }),
    init: tree.declarations.reduceRight(function (arr, tree) {
      if (!arr.length || !arr[arr.length - 1]) {
        return tree.init ? [_VariableDeclarator_init(tree, vars, glob)] : [];
      }
      arr.unshift(_VariableDeclarator_init(tree, vars, glob));
      return arr;
    }, [])
  };

  return out;

};

t.MemberExpression = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'MemberExpression');

  var base = sub(tree.object, vars, glob, [
    'Identifier',
    'MemberExpression',
    'CallExpression',
    'ThisExpression'
  ]);

  if (tree.computed) {
    return {
      type: 'IndexExpression',
      index: t.Literal(tree.property, vars, glob),
      base: base
    }
  } else {
    return {
      type: 'MemberExpression',
      indexer: '.',
      identifier: tree.property,
      base: base
    };
  }

};

var _CallExpression_base = function (tree, vars, glob) {

  return sub(tree, vars, glob, ['MemberExpression', 'Identifier']);  

};

var _CallExpression_argument = function (tree, vars, glob) {

  return sub(tree, vars, glob, [
    'Literal',
    'Identifier',
    'ObjectExpression',
    'ArrayExpression',
    'CallExpression',
    'MemberExpression'
  ]);

};

t.CallExpression = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'CallExpression');

  return {
    type: 'CallExpression',
    arguments: tree.arguments.map(function (argument) {
      return _CallExpression_argument(argument, vars, glob);
    }),
    base: _CallExpression_base(tree.callee, vars, glob)
  };

};

t.ExpressionStatement = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'ExpressionStatement');

  var expression;

  switch (tree.expression.type) {
    case 'CallExpression':
      return {
        type: 'CallStatement',
        expression: t.CallExpression(tree.expression, vars, glob)
      }
    default: throw new Error('Unexpected expression type ' + tree.expression.type);
  }

};

var _LogicalExpression_operator = function (operator) {

  switch (operator) {
    case '||': return 'or';
    case '&&': return 'and';
    default: throw new Error('Unexpected logical operator ' + operator);
  }

};

t.LogicalExpression = function (tree, vars, glob) { 
  assert.strictEqual(tree.type, 'LogicalExpression');

  return {
    type: 'LogicalExpression',
    operator: _LogicalExpression_operator(tree.operator),
    left: sub(tree.left, vars, glob),
    right: sub(tree.right, vars, glob)
  };

};

var _BinaryExpression_operator = function (operator) {

  switch (operator) {
    case '+': return '+';
    case '-': return '-';
    case '*': return '*';
    case '/': return '/';
    case '==': return '==';
    case '!=': return '~=';
    case '<': return'<';
    case '>': return '>';
    case '<=': return '<=';
    case '>=': return '>=';
    default: throw new Error('Unexpected binary operator ' + operator);
  }

};

t.BinaryExpression = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'BinaryExpression');

  return {
    type: 'BinaryExpression',
    operator: _BinaryExpression_operator(tree.operator),
    left: sub(tree.left, vars, glob),
    right: sub(tree.right, vars, glob)
  };

};

var _UnaryExpression_operator = function (operator) {

  switch (operator) {
    case '-': return '-';
    case '!': return 'not';
    default: throw new Error('Unexpected unary operator ' + operator);
  }

};

t.UnaryExpression = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'UnaryExpression');

  return {
    type: 'UnaryExpression',
    operator: _UnaryExpression_operator(tree.operator),
    argument: sub(tree.argument, vars, glob)
  }

};

t.ReturnStatement = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'ReturnStatement');

  var arg;

  if (tree.argument) {
    arg = sub(tree.argument, vars, glob);
  }

  return {
    type: 'ReturnStatement',
    arguments: arg ? [arg] : []
  };

};

t.IfStatement = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'IfStatement');
  
  var body = sub(tree.consequent, vars, glob, ['ExpressionStatement', 'BlockStatement']);

  var clauses = [{
    type: 'IfClause',
    condition: sub(tree.test, vars, glob, ['BinaryExpression', 'Literal']),
    body: body instanceof Array ? body : [body]
  }];

  if (tree.alternate) {
    var elseBody = sub(tree.alternate, vars, glob, [
      'ExpressionStatement',
      'BlockStatement',
      'IfStatement'
    ]);
    clauses.push({
      type: 'ElseClause',
      body: elseBody instanceof Array ? elseBody : [elseBody]
    });
  }

  return {
    type: 'IfStatement',
    clauses: clauses
  };

  return tree;

};

t.BlockStatement = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'BlockStatement');

  return tree.body.map(function (child) {
    return sub(child, vars, glob, [
      'VariableDeclaration',
      'ExpressionStatement',
      'ReturnStatement',
      'IfStatement'
    ]);
  });

};

t.FunctionDeclaration = function (tree, vars, glob) {
  assert.strictEqual(tree.type, 'FunctionDeclaration');

  return {
    type: 'Chunk',
    body: t.BlockStatement(tree.body, vars, glob)
  }

};

var _Program_paramInit = function (arity, params) {

  return params.map(function (param, i) {
    var index = (i < arity) ? (i + 1) : (i - arity + 1);
    var base  = (i < arity) ? 'KEYS' : 'ARGV';
    return {
      type: 'IndexExpression',
      index: {type: 'NumericLiteral', value: index, raw: index.toString()},
      base: {type: 'Identifier', name: base}
    }
  });

}; 

t.Program = function (tree, arity) {
  assert.strictEqual(tree.type, 'Program');

  if (tree.body.length !== 1 || tree.body[0].type !== 'FunctionDeclaration') {
    throw new Error('Program must contain a single top-level function');
  }

  var toplevel = tree.body[0],
      params = toplevel.params;

  var scopes = scopup(tree),
      resolved = scopup.resolve(scopes);

  scopup.annotate(tree, resolved);

  if (toplevel.body.type !== 'BlockStatement') {
    throw new Error('Program body consist of a single top-level block statement');
  }

  if (toplevel.body.body.length === 0) {
    throw new Errror('Program body must not be empty');
  }

  var firstStatement = toplevel.body.body[0];

  if (firstStatement.type !== 'ExpressionStatement' ||
      firstStatement.expression.type !== 'Literal' ||
      firstStatement.expression.value !== 'use redis') {
    throw new Error('Program body must start with "use redis" statement');
  }
  
  // Remove "use redis" statement prior to transformation 
  toplevel.body.body.splice(0, 1);
 
  var glob = {},
      body = t.BlockStatement(toplevel.body, toplevel.scopeVars, glob);

  if (params.length > 0) {
    body.unshift({
      type: 'LocalStatement',
      variables: params,
      init: _Program_paramInit(arity, params)
    });
  }

  return {
    id: toplevel.id.name,
    arity: arity,
    params: params.map(function (param) { return param.name; }),
    tree: {
      type: 'Chunk',
      body: body,
      globals: Object.keys(glob).map(function (name) { return glob[name]; })
    }
  };

};

module.exports = t.Program;
