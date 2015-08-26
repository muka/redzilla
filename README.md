redzilla
===

A node-red instances generator for your multi-user needs

Installation
---

```
git clone https://github.com/muka/redzilla.git
cd redzilla
npm i
```

Create a docker image

`sudo ./build-docker.sh`


Usage
---

A sample configuration

```
{
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

There is an example of api usage in `redzilla/examples`


TODO
---

- unit tests
- documentation
- more storage types (mongodb)
- more auth types (oauth2)
- clustering

License
---

MIT, see LICENSE for details
