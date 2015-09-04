# redzilla

A node-red as-a-service instance launcher supporting custom authentication and instance management api (over sub-processes or docker)

## Test with vagrant


Vagant image is used for development purposes but is good to use the appliance either

`vagrant up`

Visit then `http:192.168.18.83:3000/red/hello-world` to start using an instance of node-red. 

Substitute `hello-world` with your name to get your very own.

## Installation

```
git clone https://github.com/muka/redzilla.git
cd redzilla
git submodule init
git submodule update
npm i
```

### Install node-red deps

```
cd node-red
npm i
# sudo npm i -g grunt-cli
grunt build 
```

### Create a docker image

`sudo ./build-docker.sh`

## Usage


A sample configuration

```javascript
var config = {
    // used to redirect the users
    "baseUrl": "http://red.example.com",
    "debug": true,

    // see lib/auth/basic.js
    "auth": "basic",

    // see lib/storage/file.js
    "storage": "file",

    // see lib/process/docker.js
    "process": "docker",

    // location for users files eg. flow.json
    "instancesDir": "/opt/redzilla/data",

    // additional nodes to be added in the palette
    "nodesDir": "/opt/redzilla/nodes",

    "docker": {
        "image": "muka/redzilla:latest"
    },

    // bind to that host
    "host": {
        "ip": "127.0.0.1",
        "port": 80
    }
}
```

From the api

```javascript
# npm i --save muka/redzilla
var redzilla = require('redzilla')
redzilla.start(config).then(function() {
  console.log("Up and running")
})
```

There is an example of api usage in `redzilla/examples` and tests where the api is used extensively in `test/`

## Tests

Run `mocha test/*` to run unit tests


## TODO

- ~~unit tests~~
- documentation
- more storage types (mongodb)
- more auth types (oauth2)
- clustering

## License

MIT, see LICENSE for details
