
var lib = module.exports;

var config = require('./config')
    ,Promise = require('bluebird')
    ,express = require('express')
    ,logger = require('./logger')
    ,util = require('./util')
    ,processManager = require('./processManager')

var app
var server

var proxies = {}

lib.hasProxy = function(name) {
    return proxies[ name ] ? proxies[ name ] : null;
}

lib._app = app

lib.get = function () {
    return new Promise(function (ok, ko) {

        if (server) {
            return ok(server)
        }

        return lib.setup().then(ok).catch(ko)
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

    logger.debug("%s proxy to close", pkeys.length)
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

lib.getAttachApp = function() {
    return require('../index').attachApp()
}

lib.setup = function() {
    return new Promise(function (ok, ko) {

        // attach an external app & server
        var attachApp = lib.getAttachApp()

        var standalone = !attachApp

        app = attachApp ? attachApp.app : express()

        if(standalone) {
            // add access log
            app.use(function(req, res, next) {
                next()
                logger.silly("%s %s", req.method, req.url)
            })
        }
        else {
            logger.debug("Attached to existing app instance")
        }

        var _auth = require('./auth')
        // initialize, allow to add middleware before auth.handler
        _auth.initialize(app)
        // add auth
        app.use(_auth.handler)

        var _host = config.get('host')
        try {

            if(standalone) {
                server = app.listen(_host.port, _host.ip, function () {

                    var host = server.address().address;
                    var port = server.address().port;

                    logger.debug('Listening at http://%s:%s', host, port)

                    app.server = server;

                    lib.setupProxy(app)

                    return ok(server)
                })
            }
            else {

                logger.debug("Attached to existing server")
                server = attachApp.server
                app.server = app.server || server
                lib.setupProxy(app)

                return ok(server)
            }
        }
        catch(e) {
            return ko(e)
        }
    })
}

lib.getInternalUri = function(instance) {

    var localHost = instance.host || '127.0.0.1'
    var localPort = instance.port;

    return "http://" + localHost + ":" + localPort + (instance.path || '/')
}


lib.getProxy = function(name, force) {

    force = force === undefined ? false : force;

    logger.silly("Load proxy %s", name)

    if(force) {
        if(proxies[name]) {
            logger.silly("Force closing proxy")
            var _proxy = proxies[name]
            try {
                _proxy.close(function() {
                    logger.silly("Proxy closed correctly")
                })
            }
            catch(e){
                logger.warn("Error closing proxy")
                logger.error(e)
            }
            proxies[name] = null
        }
    }

    if(!proxies[name]) {

        var instance = processManager.instance(name)
        if(!instance) {
            logger.warn("No proxy for %s", name)
            return null;
        }

        var url = lib.getInternalUri(instance)

        logger.debug("Setup proxy to %s", url)
        var httpProxy = require('http-proxy')
        var proxy = httpProxy.createProxyServer({
            target: require('url').parse(url),
            ws: true
        })

        var retry = 0, timer = null;
        proxy.on('error', function(err) {

            logger.warn("Proxy error for %s", name)
            logger.error(err)

            if(timer) {
                logger.debug('Timer set, wait for retry')
                return
            }

            if(retry < 4) {
                timer = setTimeout(function() {
                    logger.info("Restarting proxy %s at %s", name, url)
                    retry++;
                    clearTimeout(timer)
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
    var userPathPrefix = config.get('userPathPrefix', '/red')
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

            // logger.silly("Proxying request %s -> %s", preq.url, url)

            preq.url = path;

            var proxy = lib.getProxy(instance.name)
            if(proxy) {
                proxy.web(preq, pres, { target: require('url').parse(localUri) })
            }
            else {
                logger.warn("HTTP Proxy not available")
            }
        }

        _proxyRequest()
    })

}

lib.setupProxy = function(app) {

    var userPathPrefix = config.get('userPathPrefix', '/red')
    var adminPathPrefix = config.get('adminPathPrefix', '/admin')

    if(!lib.getAttachApp()) {

        app.get('/favicon.ico', function (req, res) {
            res.sendFile("favicon.ico", { root: __dirname + '/../' })
        })

    }

    app.server.on('error', function(err) {
        logger.warn("[redzilla] HTTP server error: %s", e.message)
        logger.error(err)
    })

    logger.silly("Set websocket proxy")
    app.server.on('upgrade', function (preq, socket, head) {

        var url = preq.url;

        var instance = require('./util').getInstanceFromUrl(url)
        if(instance) {

            var userPath = userPathPrefix + '/' + instance.name;
            var userPathReg = userPath.replace(/\//g, '\\/')
            var path = url.replace(new RegExp(userPathReg), '')
            preq.url = path;

            logger.silly("Proxying websocket %s -> %s", url, path)

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


    // ensure instance exists and is running
    logger.silly("Set http proxy %s", userPathPrefix + '/:name')
    app.all(userPathPrefix + '/:name', function(req, res, next) {

        var name = req.params.name;
        var instance = processManager.instance(name)

        if(!instance) {

            if(req.query.nonce) {
                logger.warn("nonce found, cannot create new instance for %s", name)
                return res.status(500).send("Cannot create the manager instance")
            }

            logger.debug("Requested instance %s that is not active", name)

            if(config.get('createOnRequest', false)) {
                return processManager
                    .create(name)
                    .then(function(instance) {
                        res.redirect(req.url + '?nonce=' + (new Date).getTime())
                    })
                    .catch(function(e) {
                        logger.error("Error creating new instance for %s: %s", name, e.message)
                        res.status(500).send("Internal Error")
                    })
            }
            else {
                return res.sendStatus(404)
            }
        }

        var checkProxy = function() {

            if(!lib.hasProxy(name)) {

                logger.debug("Initializing proxy for instance %s", name)

                // force creation
                var proxy = lib.getProxy(name)
                lib.createInstanceProxy(instance)

                res.setHeader('Location', lib.getUserUri(instance, req))
                res.setHeader('X-Redirect', 1)
                res.sendStatus(302)

                return
            }

            return next()
        }

        var instanceProcess = processManager.process(name)
        if(instanceProcess) {
            return checkProxy()
        }

        processManager.start(instance)
            .then(function() {
                checkProxy()
            })
            .catch(function(e) {
                logger.warn("Cannot start instance for %s", name)
                logger.error(e)
            })

    })

    // Admin API
    var adminCreate = function (req, res) {

        var name = req.params.name;
        logger.info("[admin:create] Requested creation of instance `%s`", name)

        var result = {}

        processManager.load(name)
            .then(function(instance) {

                logger.debug("[admin:create] Instance %s started", instance.name)
                lib.createInstanceProxy(instance)

                if(req.query.redirect) {

                    logger.debug("[admin:create] Requested redirect")
                    res.redirect(lib.getUserUri(instance, req))

                    return
                }

                result.uri = lib.getUserUri(instance, req)
                res.status(200).send(result)
            })
            .catch(function(err) {
                logger.warn("[admin:create] Error occured")
                logger.error(err)
                result.error = err.code
                res.status(500).send(result)
            })

    }

    var adminOps = function (req, res) {

        var name = req.params.name;
        var op = req.params.op;

        logger.info("Requested %s for %s", op, name)

        processManager.load(name).then(function(instance) {

            logger.info("Sending %s for %s", op, name)

            var instances = require('../index').instances
            var instance
            try {
                instance = instances.get(name)
            }
            catch(e) {
                res.status(404).send()
                return Promise.resolve()
            }

            switch(op) {
                case "status":
                case "stop":
                case "start":
                case "retart":

                    return instance[op]()
                        .then(function(response) {
                            res.status(200).send(response)
                        })
                    break
                default:
                    res.status(400).send()
                    return Promise.reject(new Error("Operation not available: " + op))
                break
            }

        })
        .catch(function(err) {
            logger.error(err)
            res.status(500).send()
        })

    }

    if(config.get('adminEnableHttp', true)) {

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
}
