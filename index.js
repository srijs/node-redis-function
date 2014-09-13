var crypto = require('crypto'),
    esprima = require('esprima'),
    luamin = require('luamin'),
    transform = require('./transform');

var RedisFunction = module.exports = function (fn, arity) {

  if (!(this instanceof RedisFunction)) {
    return new RedisFunction(fn, arity);
  }

  if (typeof fn !== 'function') {
    throw new Error('Argument "fn" must be a function');
  }

  if (typeof arity !== 'number') {
    throw new Error('Argument "arity" must be a number');
  }

  var jsTree  = esprima.parse(fn.toString());

  var result = transform(jsTree, arity);
  
  result.tree.globals = [];

  this.name   = result.id;
  this.arity  = arity;
  this.script = luamin.minify(result.tree);
  this.sha1   = crypto.createHash('sha1')
                      .update(this.script)
                      .digest('hex');

};

var _eval = function (script, redis, args) {
  return redis.eval.apply(redis, [script.script, script.arity].concat(args));
}

RedisFunction.prototype.eval = function (redis) {
  return _eval(this, redis, Array.prototype.slice.call(arguments, 1));
};

RedisFunction.eval = function (redis, fn, arity) {
  return _eval(RedisFunction(fn, arity), redis, Array.prototype.slice.call(arguments, 3));
};

RedisFunction.mixin = function (object) {
  var target = object.prototype || object;
  var targetEval = target.eval;
  target.eval = function (fn, arity) {
    if (typeof fn === 'function') {
      return _eval(RedisFunction(fn, arity), this, Array.prototype.slice.call(arguments, 2));
    }
    return targetEval.apply(this, arguments);
  };
};
