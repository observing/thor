# Thor

Thor is WebSocket benchmarking/load generator. There are a lot of benchmarking
tools for HTTP servers. You've got ab, siege, wrk and more. But all these tools
only work plain ol HTTP and have no support for WebSockets and even if they did
they wouldn't be suitable as they would be testing short running HTTP requests
instead of long running HTTP requests with a lot of messaging traffic. Thor
fixes all of this.

### Dependencies

Thor requires Node.js to be installed on your system. If you don't have Node.js
installed you can download it from http://nodejs.org or build it from the github
source repository: http://github.com/joyent/node.

Once you have Node.js installed, you can use bundled package manager `npm` to
install this module:

```
npm install -g thor
```

The `-g` command flag tells `npm` to install the module globally on your system.

### Usage

```
thor [options] <urls>
```

Thor can hit multiple URL's at once, this is useful if you are testing your
reverse proxies, load balancers or just simply multiple applications. The url
that you supply to `thor` should be written in a WebSocket compatible format
using the `ws` or `wss` protocols:

```
thor --amount 5000 ws://localhost:8080 wss://localhost:8081
```

The snippet above will open up `5000` connections against the regular
`ws://localhost:8080` and also `5000` connections against the *secured*
`wss://localhost:8081` server. So a total of `10000` connections will be made.

One thing to keep in mind is that you probably need to bump the amount of file
descriptors on your local machine if you start testing WebSockets. Set the
`ulimit -n` on machine as high as possible. If you do not know how to do this,
Google it.

#### Options

```
  Usage: thor [options] ws://localhost

  Options:

    -h, --help                      output usage information
    -A, --amount <connections>      the amount of persistent connections to generate
    -C, --concurrent <connections>  how many concurrent-connections per second
    -M, --messages <messages>       messages to be send per connection
    -P, --protocol <protocol>       WebSocket protocol version
    -B, --buffer <size>             size of the messages that are send
    -W, --workers <cpus>            workers to be spawned
    -G, --generator <file>          custom message generators
    -M, --masked                    send the messaged with a mask
    -b, --binary                    send binary messages instead of utf-8
    -V, --version                   output the version number
```

Some small notes about the options:

- `--protocol` is the protocol version number. If you want to use the *HyBi drafts
  07-12* use `8` as argument or if you want to use the *HyBi drafts 13-17*
  drafts which are the default version use `13`.
- `--buffer` should be size of the message in bytes.
- `--workers` as Node.js is single threaded this sets the amount of sub
  processes to handle all the heavy lifting.

### License

MIT
