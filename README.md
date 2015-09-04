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

    // external url where users are redirected
    "baseUrl": null,
    
    // host to bind that will act as a proxy to access instances
    "host": {
        "port": "3000",
        "ip": "localhost"
    },
    
    // show debug informations
    "debug": true,
    
    // create an instance when a new one is requested via HTTP but is not available already
    "createOnRequest": true,
    
    // an hash used to create unique keys, do not change once set
    "hash": "change to a very secret hash",
    
    // auth type, see lib/auth/
    "auth": "basic",
    
    // admin auth, only for basic auth
    "admin": {
        "user": "admin",
        "pass": "admin"
    },
     
    // base port to bind, each instance will take basePort+1
    "basePort": 3002,
    
    // storage type, see lib/storage/
    "storage": "file",
    
    // storage name, may be any string
    "cacheFileName": "cache.json",
    
    // base path where node-red instances will be reachable for users
    // eg http://127.0.0.1:1234/red/<uid>
    "userPathPrefix": "/red",
    
    // base path for admin HTTP API 
    // eg http://127.0.0.1:1234/admin/<uid>/restart
    "adminPathPrefix": "/admin",
    
    // directory where user data is stored
    "instancesDir": "./instances",
    
    // custom nodes to be shown in node-red palette
    "nodesDir": "./custom-nodes",
    
    // organize palette to show
    "paletteCategories": [ "subflows", "input", "output", "function", "social", "storage", "analysis", "advanced" ],
    
    // localhost process management will spawn a new process for each user
    "localhost": {
        "node_src": "./node-red",
        "instancesDir": "./instances"
    },
    
    // docker process management will launch new docker instances for each user
    "docker": {
        "socketPath": "/var/run/docker.sock",
        "image": "muka/redzilla",
        "volumes": {
            "nodesDir": "/nodes",
            "userDir": "/user",
            "settingsFile": "/node-red/settings.js"
        }
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
