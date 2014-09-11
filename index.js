var crypto = require('crypto'),
    esprima = require('esprima'),
    luamin = require('luamin'),
    transform = require('./transform');


var Script = function (fn) {

  if (!(this instanceof Script)) {
    return new Script(fn);
  }

  if (typeof fn !== 'function') {
    throw new Error('Argument has to be a function');
  }

  var jsTree  = esprima.parse(fn.toString());

  var result = transform(jsTree);
  
  result.tree.globals = [];

  this.id     = result.id;
  this.nargs  = result.params.length;
  this.script = luamin.minify(result.tree);
  this.sha1   = crypto.createHash('sha1')
                      .update(this.script)
                      .digest('hex');

};


var Evaluator = module.exports = function (redis) {

  if (!(this instanceof Evaluator)) {
    return new Evaluator(redis);
  }

  this._scripts = {};
  this._redis   = redis;

};

Evaluator.prototype.add = function (fn) {
  var script = new Script(fn);
  this._scripts[script.id] = script;
  return script;
};

Evaluator.prototype.get = function (id) {
  return this._scripts[id];
};

Evaluator.prototype.eval = function (id) {
  var script = this.get(id);
  var args = [script.script, script.nargs].concat(Array.prototype.slice.call(arguments, 1));
  return this._redis.eval.apply(this._redis, args);
};
