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
