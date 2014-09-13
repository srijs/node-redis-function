var redis = require('redis'),
    redisFn = require('./index');

redisFn.mixin(redis.RedisClient);


function compareAndDelete (key, cmp) {
  'use redis';

  var val = this.call('get', key);
  if (val == cmp) {
    this.call('del', key);
  }
  return val;

}


var client = redis.createClient();

client.on('ready', function () {

  client.eval(compareAndDelete, 1, 'x', 'hello', function (err, val) {

    client.end();

    if (err) {
      throw err;
    }

    console.log(val);

  });

});
