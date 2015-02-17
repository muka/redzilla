
var lib = module.exports;

var config = require('../config').config,
    Promise = require('bluebird'),
    express = require('express'),
    logger = require('./logger')
;

var app;
var server;

var proxies = {};

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

            logger.info('listening at http://%s:%s', host, port);

            app.server = server;
            lib.setupProxy(app);

            return ok(server);
        });
    });
};

lib.getInternalUri = function(instance) {

    var localHost = app.server.address().address;
    var localPort = instance.port;

    return "http://" + localHost + ":" + localPort + instance.path;
};


lib.getProxy = function(name) {

    if(!proxies[name]) {

        var processManager = require('./processManager');

        var config = processManager.config(name);
        if(!config) {
            logger.warn("No proxy for %s", name);
            return null;
        }

        var url = lib.getInternalUri(config);

        var httpProxy = require('http-proxy');
        var proxy = httpProxy.createProxyServer({
            target: url,
            ws: true
        });

        logger.debug("Created new proxy to %s", url);

        proxies[name] = proxy;
    }

    return proxies[name];
};

lib.setupProxy = function(app) {

    var userPathPrefix = config.uiPathPrefix || "/red";

    var processManager = require('./processManager');

    app.server.on('upgrade', function (preq, socket, head) {

        var url = preq.url;

        var userPathReg = userPathPrefix.replace(/\//g, '\\/');
        var regxstr = userPathReg + "\/([^/]+)";
        var res = url.match(new RegExp(regxstr));

        var instance;
        if(res && (instance = processManager.config(res[1]))) {

            logger.warn(userPathReg + '\\/' + res[1]);

            var path = url.replace(new RegExp(userPathReg + '\\/' + res[1]), '');
            preq.url = path;

            logger.debug("Proxying websocket %s -> %s", url, path);

            var proxy = lib.getProxy(res[1]);
            if(proxy) {
                proxy.ws(preq, socket, head)
            }
            else {
                logger.warn("WS Proxy not available!");
            }
        }

        // ouch!
    });

    app.get('/:name', function (req, res) {

        var name = req.params.name;
        logger.info("Requested %s", name);

        processManager.load(name).then(function(instance) {

                var localUri = lib.getInternalUri(instance);

                var userPath = userPathPrefix + '/' + name + '/';
                var userUri =  "http://" + app.server.address().address + ":" + app.server.address().port + userPath;

                logger.info("Proxying %s to %s", userPath, localUri);

                var urlMatch = userPath.replace(/\//g, "\\/", "g") + "?(.*)";
//                logger.debug("reg match", urlMatch);

                app.all(new RegExp(urlMatch), function(preq, pres) {

                    var path = preq.params[0] || '/';
                    var url = localUri + path;

//                    logger.debug("Proxying request %s -> %s", preq.url, url);

                    preq.url = path;

                    var proxy = lib.getProxy(name);
                    if(proxy) {
                        proxy.web(preq, pres, { target: localUri });
                    }
                    else {
                        logger.warn("HTTP Proxy not available!");
                    }

                });

                setTimeout(function() {

                    // redirect to the proxyied URL
                    res.setHeader('Location', userUri);
                    res.sendStatus(301);
    //                res.end();

                }, 1500);

        });

    });

};