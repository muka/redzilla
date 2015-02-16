
var lib = module.exports;

var config = require('../config').config,
    Promise = require('bluebird'),
    express = require('express')

var app;
var server;

lib.get = function() {

    return new Promise(function(ok, ko) {

        if(server) {
            return ok(server);
        }

        try {
            app = express();
            server = app.listen(config.host.port, config.host.ip, function(){

                var host = server.address().address;
                var port = server.address().port;

                console.log('node-red-factory listening at http://%s:%s', host, port);

                app.server = server;
                ok(server);

            });
        }
        catch (e) {

            server = app = null;
            ko(e);
        }

    });
};

lib.app = function() {
    return new Promise(function(ok, ko) {

        if(!app) {
            return lib.get().then(function() {
                return ok(app);
            }).catch(ko);
        }

        ok(app);
    });
};