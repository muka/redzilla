redzilla
===

A node-red instances generator for your multi-user needs


Usage
---

Add to your deps

`npm i muka/redzilla --save`


Run an example

`node node_modules/redzilla/example2.js`


or setup an instance from the api

```

var redzilla = require('redzilla');

// see config.json.dist
var config = {
    host: {
        ip: 'localhost',
        port: 8080
    }
};

redzilla.start(config, function(app) {

    // app is an express app

    var i = 0;
    while(i < 10) {

        console.log("Get a node-red at http://%s:%s/admin/create/%s",
                        app.server.address().address,
                        app.server.address().port,
                        100 * i
                    );
        i++;

    }

});

```

TODO
---

 - Provide a proper API for instances management
 - Add other auth types (eg oauth2) and storage systems (eg redis)
 - Ensure everything works

Fill an issue to suggest more

License
---

MIT, see LICENSE for details