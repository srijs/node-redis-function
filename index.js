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
  this.nargs  = result.arity;
  this.script = luamin.minify(result.tree);
  this.sha1   = crypto.createHash('sha1')
                      .update(this.script)
                      .digest('hex');

};

module.exports.eval = function (redis, fn) {

  var script = new Script(fn);

  var args = [script.script, script.nargs].concat(Array.prototype.slice.call(arguments, 2));

  return redis.eval.apply(redis, args);

};
