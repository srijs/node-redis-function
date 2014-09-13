# redis function - redis scripts in javascript

_Notice: this module is under heavy development and not yet ready for production. Also, a great part of the js syntax is not yet supported.n_

This is an interface for transpiling Javascript functions to [Lua](http://www.lua.org/) code and running them on the [Redis scripting engine](http://redis.io/commands/eval).

It is designed to work as a companion to the [excellent `node_redis` module](https://github.com/mranney/node_redis), although it is of course possible to use it with any other redis client library.

Install with:

    npm install redis-function
    
## Usage

Simple example, included as example.js:

```js
    var redis = require('redis'),
        RedisFunction = require('redis-function');

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
```

This will display:

```
Reply: OK
Reply: bar
Reply: bar
```

## API

### Mixins (via `RedisFunction.mixin(client)`)

#### client.eval(fn, arity, args..., cb)

Compiles the given function to lua code, and executes it on the redis scripting engine.

### RedisFunction

#### RedisFunction.mixin(client)

Replaces the `RedisClient.eval` method with one which intercepts calls that pass `Function` objects, and compiles the function on-the-fly to lua code.

#### new RedisFunction(fn, arity)

Compiles the given function to lua code, and returns an object which represents the compiled lua script.

#### function.eval(redisClient, args..., cb)

Executes the function on the redis scripting engine.

#### function.name

The name of the function that was compiled. In the simple example (above), it equals `'compareAndDelete'`.

#### function.arity

The number of key parameters that should be passed to the function.

#### function.script

The lua code the function was transpiled to.

#### function.sha1

The SHA-1 hash of the lua code. You can use this with the redis `EVALSHA` command. Note, however, that `RedisClient` already handles this for you, and there is no need to do it manually.

#### RedisFunction.eval(redisClient, fn, arity, args..., cb)

Convenience method for `RedisFunction(fn, arity).eval(redisClient, args..., cb)`.