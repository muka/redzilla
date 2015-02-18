
var lib = module.exports;

var config = require('../config'),
    Promise = require('bluebird'),
    express = require('express'),
    logger = require('./logger'),
    util = require('./util'),
    processManager = require('./processManager')
;

var userPathPrefix = config.get('userPathPrefix', '/red');
var adminPathPrefix = config.get('adminPathPrefix', '/admin');

var dbg = util.dbg;

var app;
var server;

var proxies = {};

lib.hasProxy = function(name) {
    return proxies[ name ] ? proxies[ name ] : null;
};

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

        var _host = config.get('host');
        server = app.listen(_host.port, _host.ip, function () {

            var host = server.address().address;
            var port = server.address().port;

            dbg('Listening at http://%s:%s', host, port);

            app.server = server;

            // add auth
            app.all('*', require('./auth').handler);

            lib.setupProxy(app);

            return ok(server);
        });
    });
};

lib.getInternalUri = function(instance) {

    var localHost = app.server.address().address;
    var localPort = instance.port;

    return "http://" + localHost + ":" + localPort + (instance.path || '/');
};


lib.getProxy = function(name, force) {

    force = force === undefined ? false : force;

    if(force) {
        if(proxies[name]) {
            proxies[name] = null;
        }
    }

    if(!proxies[name]) {

        var instance = processManager.config(name);
        if(!instance) {
            logger.warn("No proxy for %s", name);
            return null;
        }

        var url = lib.getInternalUri(instance);

        var httpProxy = require('http-proxy');
        var proxy = httpProxy.createProxyServer({
            target: require('url').parse(url),
            ws: true
        });

        var retry = 0, timer = null;
        proxy.on('error', function(err) {

            logger.warn("Proxy error for %s", name);
            logger.error(err);

            if(timer) return;

            if(retry < 4) {
                logger.info("Restarting proxy %s at %s", name, url);
                timer = setTimeout(function() {

                    retry++;
                    timer = null;

                    lib.getProxy(name, true);

                }, 1000);
            }
            else {
                logger.error("Cannot restart proxy at %s", url);
            }

        });

        logger.debug("Created new proxy to %s", url);

        proxies[name] = proxy;
    }

    return proxies[name];
};

lib.getUserPath = function(instance) {
    return userPathPrefix + '/' + instance.name + '/';
};

lib.getUserUri = function(instance) {
    return "http://" + app.server.address().address + ":" + app.server.address().port + lib.getUserPath(instance);
};

lib.createInstanceProxy = function(instance) {

    var localUri = lib.getInternalUri(instance);
    var userPath = lib.getUserPath(instance);

    logger.info("Proxying %s to %s", userPath, localUri);

    var urlMatch = userPath.replace(/\//g, "\\/", "g") + "?(.*)";
    var regUrlMatch = new RegExp(urlMatch);

    app.all(regUrlMatch, function(preq, pres, next) {

        var _proxyRequest = function() {

            var path = preq.params[0] || '/';
            var url = localUri + path;

            dbg("Proxying request %s -> %s", preq.url, url);

            preq.url = path;

            var proxy = lib.getProxy(instance.name);
            if(proxy) {
                proxy.web(preq, pres, { target: require('url').parse(localUri) });
            }
            else {
                logger.warn("HTTP Proxy not available!");
            }
        };

        _proxyRequest();
    });

};

lib.setupProxy = function(app) {

    app.server.on('error', function(err) {
        logger.error("HTTP server error");
        logger.error(err);
    });

    app.server.on('upgrade', function (preq, socket, head) {

        var url = preq.url;

        var instance = require('./util').getInstanceFromUrl(url);
        if(instance) {

            var userPath = config.get('userPathPrefix', '/red') + '/' + instance.name;
            var userPathReg = userPath.replace(/\//g, '\\/');
            var path = url.replace(new RegExp(userPathReg), '');
            preq.url = path;

            dbg("Proxying websocket %s -> %s", url, path);

            var proxy = lib.getProxy(instance.name);
            if(proxy) {
                proxy.ws(preq, socket, head);
            }
            else {
                logger.warn("WS Proxy not available!");
            }
        }

        // ouch!
    });

    // ensure instance exists and is running
    app.all(userPathPrefix + '/:name', function(req, res, next) {

        var name = req.params.name;
        var instance = processManager.config(name);

        if(!instance) {

            logger.debug("Requested instance %s that is not managed", name);

            res.setHeader('Location', adminPathPrefix + '/create/' + name);
            return res.sendStatus(302);
        }

        if(!lib.hasProxy(name)) {

            logger.debug("Initializing proxy for instance %s", name);

            // force creation
            var proxy = lib.getProxy(name);
            lib.createInstanceProxy(instance);

            res.setHeader('Location', lib.getUserUri(instance));
            res.setHeader('X-Redirect', 1);

            setTimeout(function() {
                res.sendStatus(302);
            }, 1000);

            return true;
        }

        return next();
    });

    app.get(adminPathPrefix + '/create/:name', function (req, res) {

        var name = req.params.name;
        logger.info("Requested %s", name);

        processManager.load(name).then(function(instance) {

            lib.createInstanceProxy(instance);

            setTimeout(function() {

                // redirect to the proxyied URL
                res.setHeader('Location', lib.getUserUri(instance));
                res.sendStatus(301);
        //                res.end();

            }, 1500);

        });

    });

};