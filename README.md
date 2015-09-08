# redzilla

A node-red as-a-service instance launcher supporting custom authentication and instance management api (over sub-processes or docker)

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

## Run the package

`node bin/redzilla run`

Visit then `http://192.168.18.83:3000/red/hello-world` to start using an instance of node-red.

Substitute `hello-world` with your name to get your very own.

## Test with vagrant

Vagant image is used for development mainly but may be good to try the appliance either

```
vagrant up
vagrant ssh
cd /vagrant
bin/redzilla run -c examples/vagrant.config.json
```

## Examples

Run `node examples/example.js` and visit `http://127.0.0.1:3000`

The example creates a list of links that points to new instances

### Create a docker image

`sudo ./build-docker.sh`

## Usage

A sample configuration can be found in `config.default.json`

From the api

```javascript
# npm i --save muka/redzilla
var redzilla = require('redzilla')
redzilla.start(config).then(function() {
  console.log("Up and running")
  return redzilla.getServerManager().app()
})
.then(function(app) {
  // `app` is an express instance
})
```

There is an example of api usage in `redzilla/examples` and tests  in `test/` folder where the api is used extensively

## Tests

Run `mocha test/*` to run unit tests

## TODO

- ~~unit tests~~
- documentation
- more storage types (mongodb)
- more auth types (oauth2 via passportjs)
- clustering

## License

The MIT License

Copyright (c) 2015 luca capra <luca.capra@gmail.com>

See LICENSE for further informations
