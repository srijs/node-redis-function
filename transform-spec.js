var util = require('util'),
    assert = require('assert'),
    esprima = require('esprima'),
    luaparse = require('luaparse'),
    transform = require('./transform');

var scriptEqual = function (lua, js) {
  var luaTree = luaparse.parse(lua, {
    comments: false
  });
  var jsTree = esprima.parse(js.toString());
  try {
    assert.deepEqual(luaTree, transform(jsTree));
  } catch (e) {
    console.log(util.inspect(jsTree, {depth: null}));
    console.log(util.inspect(luaTree, {depth: null}));
    console.log(util.inspect(transform(jsTree), {depth: null}));
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
