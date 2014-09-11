var util = require('util'),
    assert = require('assert'),
    esprima = require('esprima'),
    luaparse = require('luaparse'),
    jsondiff = require('json-diff'),
    transform = require('./transform');

var scriptEqual = function (lua, js) {
  var luaTree = luaparse.parse(lua, {
    comments: false
  });
  var jsTree = esprima.parse(js.toString());
  var tree = transform(jsTree).tree;
  try {
    assert.deepEqual(luaTree, tree);
  } catch (e) {
    console.log(jsondiff.diffString(tree, luaTree));
    throw new Error('NOT EQUAL');
  }
};

describe('Variable Declaration', function () {

  it('single declaration', function () {
    scriptEqual('local a', function script () {
      var a; 
    });
  });

  it('multiple declarations', function () {
    scriptEqual('local a, b', function script () {
      var a, b;
    });
  });

  it('single declaration w/ numeric literal init', function () {
    scriptEqual('local a = 5', function script () {
      var a = 5;
    });
  });

  it('multiple declarations w/ numeric literal init', function () {
    scriptEqual('local a, b = 5, 7', function script () {
      var a = 5, b = 7;
    });
  });
  
  it('multiple declarations w/ mixed (none and numeric literal) init', function () {
    scriptEqual('local a, b, c = nil, 7', function script () {
      var a, b = 7, c;
    });
  });

  it('single declaration w/ empty table init', function () {
    scriptEqual('local t = {}', function script () {
      var t = {};
    });
  });
  
  it('single declaration w/ mixed-type array table init', function () {
    scriptEqual('local t = {a = 1, b = "abc", c = {}, d = {}}', function script () {
      var t = {a: 1, b: "abc", c: {}, d: []};
    });
  });

  it('single declaration w/ nested table init', function () {
    scriptEqual('local t = {c = {d = {e = 5}}}', function script () {
      var t = {c: {d: {e: 5}}};
    });
  });

  it('single declaration w/ mixed-key array table init', function () {
    scriptEqual('local t = {a = 1, ["b"] = 2, [2] = 22}', function script () {
      var t = {a: 1, "b": 2, 2: 22};
    });
  });

});

describe('Member Access', function () {

  it('simple non-computed access', function () {
    scriptEqual('local x = a.b', function script () {
      var x = a.b;
    });
  });

  it('nested non-computed access', function () {
    scriptEqual('local x = a.b.c', function script () {
      var x = a.b.c;
    });
  });
  
  it('nested non-computed access, mixed with calls', function () {
    scriptEqual('local x = a.b().c', function script () {
      var x = a.b().c;
    });
  });

  it('simple numeric computed access', function () {
    scriptEqual('local x = a[1]', function script () {
      var x = a[1];
    });
  });

  it('nested numeric computed access', function () {
    scriptEqual('local x = a[1][2]', function script () {
      var x = a[1][2];
    });
  });

  it('nested mixed computed access', function () {
    scriptEqual('local x = a[1]["b"]', function script () {
      var x = a[1]["b"];
    });
  });

  it('nested mixed computed access, mixed with calls', function () {
    scriptEqual('local x = a[1]()["b"]', function script () {
      var x = a[1]()["b"];
    });
  });

  it('nested mixed access, mixed with calls', function () {
    scriptEqual('local x = a[1]()["b"].c', function script () {
      var x = a[1]()["b"].c;
    });
  });

});

describe('Function Call', function () {

  it('single function call, no arguments', function () {
    scriptEqual('redis.call()', function script () {
      redis.call();
    });
  });

  it('single function call, one numeric argument', function () {
    scriptEqual('redis.call(1)', function script () {
      redis.call(1);
    });
  });

  it('single function call, mixed-type arguments', function () {
    scriptEqual('redis.call(1.1, {}, {7,8}, "foo")', function script () {
      redis.call(1.1, {}, [7,8], "foo");
    });
  });

  it('single function call, nested arguments', function () {
    scriptEqual('redis.call(1.1, redis.call({}), {7,8}, "foo")', function script () {
      redis.call(1.1, redis.call({}), [7,8], "foo");
    });
  });

});

describe('Return Statement', function () {

  it('no value', function () {
    scriptEqual('return', function script () {
      return;
    });
  });

  it('literal value', function () {
    scriptEqual('return 5', function script () {
      return 5;
    });
  });
  
  it('binary expression value', function () {
    scriptEqual('return x == 5', function script () {
      return x == 5;
    });
  });
  
  it('call expression value', function () {
    scriptEqual('return x()', function script () {
      return x();
    });
  });

  it('member expression value', function () {
    scriptEqual('return x.y', function script () {
      return x.y;
    });
  });

});

describe('If Statament', function () {

  it('simple one-line w/o else', function () {
    scriptEqual('if true then x() end', function script () {
      if (true) x();
    });
  });

  it('simple blockw w/o else', function () {
    scriptEqual('if true then x() end', function script () {
      if (true) {
        x();
      }
    });
  });
  
  it('simple block w/ one-line else', function () {
    scriptEqual('if true then x() else y() end', function script () {
      if (true) {
        x();
      } else y();
    });
  });

  it('simple block w/ block else', function () {
    scriptEqual('if true then x() else y() end', function script () {
      if (true) {
        x();
      } else {
        y();
      }
    });
  });

  it('block w/ block else w/ nested if', function () {
    scriptEqual('if true then x() else if false then y() end end', function script () {
      if (true) {
        x();
      } else if (false) {
        y();
      }
    });
  });

});

describe('Simple Examples', function () {

  it('compare and delete', function () {
    scriptEqual([
      "local val = redis.call('get', KEYS[1])",
      "if val == ARGV[1] then redis.call('del', KEYS[1]) end",
      "return val"
    ].join('\n'), function script () {
      var val = redis.call('get', KEYS[1]);
      if (val == ARGV[1]) {
        redis.call('del', KEYS[1]);
      }
      return val;
    });
  });

});
