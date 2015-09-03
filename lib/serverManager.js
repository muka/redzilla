
var lib = module.exports;

var config = require('./config')
    ,Promise = require('bluebird')
    ,express = require('express')
    ,logger = require('./logger')
    ,util = require('./util')
    ,processManager = require('./processManager')


var userPathPrefix = config.get('userPathPrefix', '/red')
var adminPathPrefix = config.get('adminPathPrefix', '/admin')

var dbg = util.dbg;
var silly = util.silly;

var app;
var server;

var proxies = {}

lib.hasProxy = function(name) {
    return proxies[ name ] ? proxies[ name ] : null;
}

lib._app = app;

lib.get = function () {
    return new Promise(function (ok, ko) {

        if (server) {
            return ok(server)
        }

        return lib.setup().then(ok).catch(ko)
    })
}

lib.stop = function() {

    if(server) {
        try {
            logger.debug("Closed main http server")
            server.close()
        }
        catch(e) {}
    }

    var pkeys = Object.keys(proxies)

    if(pkeys.length === 0) {
        logger.debug("No proxy to close")
        return Promise.resolve()
    }

    return Promise.all(pkeys).each(function(proxyId) {
        var proxy = proxies[proxyId]
        return new Promise(function(ok, ko) {
            proxy.close(function() {
                logger.debug("Closed proxy %s", proxyId)
                ok()
            })
        })
    })
}

lib.start = lib.app = function () {
    return new Promise(function (ok, ko) {

        if (!app) {
            return lib.get().then(function () {
                return ok(app)
            }).catch(ko)
        }

        ok(app)
    })
}


lib.setup = function() {
    return new Promise(function (ok, ko) {

        app = express()

        var _auth = require('./auth')

        // initialize, allow to add middleware before auth.handler
        _auth.initialize(app)

        // add auth
        app.use(_auth.handler)

        var _host = config.get('host')
        server = app.listen(_host.port, _host.ip, function () {

            var host = server.address().address;
            var port = server.address().port;

            dbg('Listening at http://%s:%s', host, port)

            app.server = server;

            lib.setupProxy(app)

            return ok(server)
        })
    })
}

lib.getInternalUri = function(instance) {

//    var localHost = app.server.address().address;
    var localHost = 'localhost';
    var localPort = instance.port;

    return "http://" + localHost + ":" + localPort + (instance.path || '/')
}


lib.getProxy = function(name, force) {

    force = force === undefined ? false : force;

    if(force) {
        if(proxies[name]) {
            var _proxy = proxies[name]
            try {
                _proxy.close(function() {
                    logger.silly("Proxy closed correctly")
                })
            }
            catch(e){
                logger.warn("Error closing proxy")
            }
            proxies[name] = null;
        }
    }

    if(!proxies[name]) {

        var instance = processManager.config(name)
        if(!instance) {
            logger.warn("No proxy for %s", name)
            return null;
        }

        var url = lib.getInternalUri(instance)

        var httpProxy = require('http-proxy')
        var proxy = httpProxy.createProxyServer({
            target: require('url').parse(url),
            ws: true
        })

        var retry = 0, timer = null;
        proxy.on('error', function(err) {

            logger.warn("Proxy error for %s", name)
            logger.error(err)

            if(timer) return;

            if(retry < 4) {
                logger.info("Restarting proxy %s at %s", name, url)
                timer = setTimeout(function() {
                    retry++;
                    timer = null;
                    lib.getProxy(name, true)
                }, 1000)
            }
            else {
                logger.error("Cannot restart proxy at %s", url)
            }

        })

        logger.silly("Created new proxy to %s", url)

        proxies[name] = proxy;
    }

    return proxies[name];
}

lib.getUserPath = function(instance) {
    return userPathPrefix + '/' + instance.name + '/';
}

lib.getUserBaseUrl = function(req) {

    var baseUrl = config.get('baseUrl')
    if(baseUrl) {
        return baseUrl;
    }

    var host = app.server.address().address,
        port = app.server.address().port;

    if(req) {

        var url = require('url').parse(req.url)

        host = url.host ? url.host : host;
        port = url.port ? url.port : port;
    }

    return "http://" + host + ":" + port;
}

lib.getUserUri = function(instance, req) {
    return  lib.getUserBaseUrl(req) + lib.getUserPath(instance)
}

lib.createInstanceProxy = function(instance) {

    var localUri = lib.getInternalUri(instance)
    var userPath = lib.getUserPath(instance)

    logger.info("Proxying %s to %s", userPath, localUri)

    var urlMatch = userPath.replace(/\//g, "\\/", "g") + "?(.*)";
    var regUrlMatch = new RegExp(urlMatch)

    app.all(regUrlMatch, function(preq, pres, next) {

        var _proxyRequest = function() {

            var path = preq.params[0] || '/';
            var url = localUri + path;

            silly("Proxying request %s -> %s", preq.url, url)

            preq.url = path;

            var proxy = lib.getProxy(instance.name)
            if(proxy) {
                proxy.web(preq, pres, { target: require('url').parse(localUri) })
            }
            else {
                logger.warn("HTTP Proxy not available!")
            }
        }

        _proxyRequest()
    })

}

lib.setupProxy = function(app) {

    app.server.on('error', function(err) {
        logger.error("HTTP server error")
        logger.error(err)
    })

    app.server.on('upgrade', function (preq, socket, head) {

        var url = preq.url;

        var instance = require('./util').getInstanceFromUrl(url)
        if(instance) {

            var userPath = config.get('userPathPrefix', '/red') + '/' + instance.name;
            var userPathReg = userPath.replace(/\//g, '\\/')
            var path = url.replace(new RegExp(userPathReg), '')
            preq.url = path;

            silly("Proxying websocket %s -> %s", url, path)

            var proxy = lib.getProxy(instance.name)
            if(proxy) {
                proxy.ws(preq, socket, head)
            }
            else {
                logger.warn("WS Proxy not available!")
            }
        }

        // ouch!
    })

    app.get('/favicon.ico', function (req, res) {
        res.sendFile("favicon.ico", { root: __dirname + '/../' })
    })

    // ensure instance exists and is running
    app.all(userPathPrefix + '/:name', function(req, res, next) {

        var name = req.params.name;
        var instance = processManager.config(name)

        if(!instance) {

            logger.debug("Requested instance %s that is not managed", name)

            if(config.config.createOnRequest) {
                return res.redirect(adminPathPrefix + '/' + name + '/create?redirect=1')
            }
            else {
                return res.sendStatus(404)
            }
        }

        if(!lib.hasProxy(name)) {

            logger.debug("Initializing proxy for instance %s", name)

            // force creation
            var proxy = lib.getProxy(name)
            lib.createInstanceProxy(instance)

            res.setHeader('Location', lib.getUserUri(instance, req))
            res.setHeader('X-Redirect', 1)
            res.sendStatus(302)

            return true;
        }

        return next()
    })

    // Admin API
    var adminCreate = function (req, res) {

        var name = req.params.name;
        logger.info("Requested %s", name)

        var result = {}

        processManager.load(name).then(function(instance) {

            logger.debug("=== Instance %s started ===", instance.name)
            lib.createInstanceProxy(instance)

            if(req.query.redirect) {

                logger.debug("Requested redirect")
                res.redirect(lib.getUserUri(instance, req))

                return;
            }

            result.uri = lib.getUserUri(instance, req)
            res.status(200).send(result)


        })
        .catch(function(err) {

            logger.error(err)

            result.error = err.code;

            res.status(500).send(result)

        })

    }

    var adminOps = function (req, res) {

        var name = req.params.name;
        var op = req.params.op;

        logger.info("Requested %s for %s", op, name)

        processManager.load(name).then(function(instance) {

            logger.info("Sending %s for %s", op, name)

            switch(op) {
                case "status":
                    return processManager.status(name).then(function(response) {
                        res.status(200).send(response)
                    })
                    break;
            }

        })
        .catch(function(err) {
            logger.error(err)
            res.status(500).send(err)
        })

    }

    var _auth = require('./auth')

    // Create or load instance
    // GET  admin-url/:name/create?redirect=1|0
    // POST admin-url/:name
    app.get(adminPathPrefix + '/:name/create', _auth.handler, adminCreate)
    app.post(adminPathPrefix + '/:name', _auth.handler, adminCreate)

    // Start / Stop
    // GET admin-path/:name/status
    app.get(adminPathPrefix + '/:name/:op', _auth.handler, adminOps)


}
