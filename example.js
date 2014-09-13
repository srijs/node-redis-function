var redis = require('redis'),
    eval = require('./index').eval;

var client = redis.createClient();

function compareAndDelete$1 (key, cmp) {
  'use redis';

  var val = this.call('get', key);
  if (val == cmp) {
    this.call('del', key);
  }
  return val;

}

client.on('ready', function () {

  eval(client, compareAndDelete$1, 'x', 'hello', function (err, val) {
    if (err) {
      console.error('Error: ' + err);
    } else {
      console.log('Result: ' + val);
    }
    client.end();
  });

});
