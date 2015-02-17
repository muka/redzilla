
var lib = module.exports;

var config = require('../config').config,
        Promise = require('bluebird'),
        express = require('express')

var app;
var server;

lib.get = function () {

    return new Promise(function (ok, ko) {

        if (server) {
            return ok(server);
        }

        return lib.setup().then(ok).catch(ko);
    });
};

lib.app = function () {
    return new Promise(function (ok, ko) {

        if (!app) {
            return lib.get().then(function () {
                return ok(app);
            }).catch(ko);
        }

        ok(app);
    });
};


lib.setup = function() {
    return new Promise(function (ok, ko) {

        app = express();
        server = app.listen(config.host.port, config.host.ip, function () {

            var host = server.address().address;
            var port = server.address().port;

            console.log('listening at http://%s:%s', host, port);

            app.server = server;
            lib.setupProxy(app);

            return ok(server);
        });
    });
};

lib.setupProxy = function(app) {

    var process = require('./processManager');
    app.get('/:name', function (req, res) {

        var name = req.params.name;
        console.log("Requested %s", name);

        process.load(name).then(function(instance) {

                var localHost = app.server.address().address;
                var localPort = instance.port;

                var localUri = "http://" + localHost + ":" + localPort + instance.path;

                var userPath = '/red/' + name + '/';
                var userUri =  "http://" + app.server.address().address + ":" + app.server.address().port + userPath;

                var httpProxy = require('http-proxy');
                var proxy = app.proxy = httpProxy.createProxyServer({
                    target: localUri,
                    ws: true
                });

                console.log("Proxying %s to %s", userPath, localUri);

                var urlMatch = userPath.replace(/\//g, "\\/", "g") + "?(.*)";
//                console.log("reg match", urlMatch);

                app.all(new RegExp(urlMatch), function(preq, pres) {

                    var path = preq.params[0] || '/';

//                    console.log("Proxying request %s -> %s", preq.url, path);

                    preq.url = path;

                    proxy.proxyRequest(preq, pres, {
//                        target: localUri
                        host: localHost,
                        port: localPort
                    });
                });

                app.server.on('upgrade', function (preq, socket, head) {

                    var path = preq.url.replace(userPath, "");

//                    console.log("Proxying websocket %s -> %s", preq.url, path);

                    preq.url = path;

                    proxy.ws(preq, socket, head);
                });

            setTimeout(function() {

                // redirect to the proxyied URL
                res.setHeader('Location', userUri);
                res.sendStatus(301);

            }, 1500);

        });

    });

};