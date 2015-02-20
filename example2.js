
var redzilla = require('./index');

// see config.json.dist
var config = {
    host: {
        ip: 'localhost',
        port: 8080
    }
};

redzilla.start(config, function(app) {

    // app is an express app

    var i = 1;
    while(i < 10) {

        console.log("Get a node-red at http://%s:%s/admin/create/%s",
                        app.server.address().address,
                        app.server.address().port,
                        100 * i
                    );
        i++;

    }

});
