# Thor

Thor is WebSocket benchmarking/load generator. There are a lot of benchmarking
tools for HTTP servers. You've got ab, siege, wrk and more. But all these tools
only work with plain ol HTTP and have no support for WebSockets - even if they did
they wouldn't be suitable, as they would be testing short running HTTP requests
instead of long running HTTP requests with a lot of messaging traffic. Thor
fixes all of this.

### Dependencies

Thor requires Node.js to be installed on your system. If you don't have Node.js
installed you can download it from http://nodejs.org or build it from the github
source repository: http://github.com/joyent/node.

Once you have Node.js installed, you can use the bundled package manager `npm` to
install this module:

```
npm install -g git://github.com/iorichina/thor.git
```

The `-g` command flag tells `npm` to install the module globally on your system.

### Usage

```
thor [options] <urls>
socketio [options] <urls>
```

Thor can hit multiple URL's at once; this is useful if you are testing your
reverse proxies, load balancers or just simply multiple applications. The url
that you supply to `thor` should be written in a WebSocket compatible format
using the `ws` or `wss` protocols:

```
thor --amount 5000 ws://localhost:8080 wss://localhost:8081
```
or use http/https if and only if ur using socket.io(nodejs/java/etc) in server
```
socketio --amount 5000 http://localhost:8080/ https://localhost:8081/
```

The snippet above will open up `5000` connections against the regular
`ws://localhost:8080` and also `5000` connections against the *secured*
`wss://localhost:8081` server, so a total of `10000` connections will be made.

One thing to keep in mind is you probably need to bump the amount of file
descriptors on your local machine if you start testing WebSockets. Set the
`ulimit -n` on machine as high as possible. If you do not know how to do this,
Google it.

And the other thing u have to know is that, one ip can only create max to 60 thousands connections,
which is limited by TCP/IP protocal. U can special the [@@one_of_the_machine_vip] after the url.

#### thor Options

```
  Usage: thor [options] urls

         urls like
         ws://localhost:8080/?params
         ws://localhost:8080/?params  ws://localhost:8080/socket.io/?transport=websocket
         ws://localhost:8080/?params@@192.168.102.33  ws://localhost:8080/socket.io/?transport=websocket@@192.168.102.53

  Options:

    -h, --help                      output usage information
    -A, --amount <connections>      the amount of persistent connections to generate, default 10000
    -C, --concurrent [connections]  [deprecated]how many concurrent-connections per second, default 0
    -M, --messages [messages]       number of messages to be send per connection, default 0
    -P, --protocol [protocol]       WebSocket protocol version, default 13
    -B, --buffer [size]             size of the messages that are send, default 1024
    -W, --workers [cpus]            workers to be spawned, default cpus.length
    -G, --generator [file]          custom message generators
    -M, --masked                    send the messaged with a mask
    -b, --binary                    send binary messages instead of utf-8
    --SE, --serverEngine [engine]   "socket.io"/"engine.io"(nodejs), "netty-socketio"(java) must be specified if ur using these engine in ur server
    --PI, --pingInterval [seconds]  seconds for doing ping to keep-alive, default 50
    --SI, --statInterval [seconds]  show stat info interval, default 60
    --RT, --runtime [seconds]       timeout to close socket(seconds), default to unlimited, u must stop by ctrl+c
    -V, --version                   output the version number
```

Some small notes about the options:

- `--protocol` is the protocol version number. If you want to use the *HyBi drafts
  07-12* use `8` as argument or if you want to use the *HyBi drafts 13-17*
  drafts which are the default version use `13`.
- `--buffer` should be size of the message in bytes.
- `--workers` as Node.js is single threaded this sets the amount of sub
  processes to handle all the heavy lifting.

#### socketio Options

```
  Usage: socketio [options] urls

         urls like
         http://localhost:8080/
         http://localhost:8080/?params
         http://localhost:8080/?params@@192.168.102.53

  Options:

    -h, --help                      output usage information
    -A, --amount <connections>      the amount of persistent connections to generate, default 10000
    -C, --concurrent [connections]  [deprecated]how many concurrent-connections per second, default 0
    -M, --messages [messages]       number of messages to be send per connection, default 0
    -P, --protocol [protocol]       WebSocket protocol version, default 13
    -B, --buffer [size]             size of the messages that are send, default 1024
    -W, --workers [cpus]            workers to be spawned, default cpus.length
    -G, --generator [file]          custom message generators
    -M, --masked                    send the messaged with a mask
    -b, --binary                    send binary messages instead of utf-8
    --TP, --transport [transport]   "polling"/"websocket" default websocket
    --PI, --pingInterval [seconds]  seconds for doing ping to keep-alive, default 50
    --SI, --statInterval [seconds]  show stat info interval, default 60
    --RT, --runtime [seconds]       timeout to close socket(seconds), default to unlimited, u must stop by ctrl+c
    -V, --version                   output the version number
```


### Custom messages

Some WebSocket servers have their own custom messaging protocol. In order to
work with those servers we introduced a concept called `generators` a generator
is a small JavaScript file that can output `utf8` and `binary` messages. It uses
a really simple generator by default. 

Checkout https://github.com/observing/thor/blob/master/generator.js for an
example of a generator.

```
thor --amount 1000 --generator <file.js> ws://localhost:8080
```

### Example

```
thor --amount 5000 ws://localhost:8080
```

This will hit the WebSocket server that runs on localhost:8080 with 1000
connections and sends 100 messages over each established connection. Once `thor`
is done with smashing your connections it will generate a detailed report:

```
Thor:                                                  version: 1.1.2

God of Thunder, son of Odin and smasher of WebSockets!

Thou shall:
- Spawn 4 workers.
- Create all the concurrent connections.
- Smash 5000 connections .

Connecting to ws://localhost:8080

  ◜  Progress :: Created 0, Active 0, @2015-11-11 17:31:15 ==> this will hide after process end

Online               96728 milliseconds
Time taken           96728 milliseconds
Connected            2211
Disconnected         0
Failed               2789
Total transferred    658.86kB
Total received       631.64kB

Durations (ms):

                     min     mean     stddev  median max
Handshaking          171     3354       1631    2915 7737
Latency              NaN     NaN         NaN     NaN NaN

Percentile (ms):

                      50%     66%     75%     80%     90%     95%     98%     98%    100%
Handshaking          2915    3627    4705    4827    5811    6412    7686    7712    7737
Latency              NaN     NaN     NaN     NaN     NaN     NaN     NaN     NaN     NaN

Received errors:

2789x                undefined
```

### Example

```
socketio --amount 5000 --RT 300 --SI 30 http://localhost:8080/
```

```
Thor:                                                  version: 1.1.2

God of Thunder, son of Odin and smasher of WebSockets!

Thou shall:
- Spawn 4 workers.
- Create all the concurrent connections.
- Smash 5 connections.

Connecting to http://localhost:8080/



Online               137539 milliseconds
Time taken           137539 milliseconds
Connected            5000
Disconnected         0
Failed               0
Total transferred    14.59kB
Total received       14.68kB

Durations (ms):

                     min     mean     stddev  median max
Handshaking          598     614          13     610 638
Latency              NaN     NaN         NaN     NaN NaN

Percentile (ms):

                      50%     66%     75%     80%     90%     95%     98%     98%    100%
Handshaking          610     617     617     638     638     638     638     638     638
Latency              NaN     NaN     NaN     NaN     NaN     NaN     NaN     NaN     NaN
```

### License

MIT
