var redis = require('redis'),
    RedisFunction = require('./index');

RedisFunction.mixin(redis.RedisClient);


function compareAndDelete (key, cmp) {
  'use redis';

  var val = this.call('get', key);
  if (val == cmp) {
    this.call('del', key);
  }
  return val;

}


var client = redis.createClient();
client.set('foo', 'bar', redis.print);
client.eval(compareAndDelete, 1, 'foo', 'baz', redis.print);
client.eval(compareAndDelete, 1, 'foo', 'bar', redis.print);
client.quit();