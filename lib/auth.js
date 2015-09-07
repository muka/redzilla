
var lib = module.exports;

var logger = require("./logger"),
    processManager = require("./processManager"),
    config = require("./config"),
    Promise = require("bluebird")
;

var types = {
    none: require('./auth/none'),
    basic: require('./auth/basic'),
}

lib.addType = function(type, callback) {
    types[ type ] = callback;
}

lib.handler = function(req, res, next) {

    var type = config.get('auth', 'basic')

    // type is null, no auth at all
    if(type === false || type === null) {
        return next()
    }

    // logger.silly("Checking auth for " + req.url)

    if(types[ type ] === undefined) {
        throw new Error("Auth type " + type + " is not available")
        return res.send(500)
    }

    var auth = types[ type ];
    auth.handler(req, res, next)
}

lib.initialize = function(app) {

    logger.debug("Initializing auth")

    var type = config.get('auth', 'basic')

    // type is null, no auth at all
    if(type === null) {
        return;
    }

    if(types[ type ] === undefined) {
        throw new Error("Auth type " + type + " is not available")
        return res.send(500)
    }

    var auth = types[ type ];
    auth.initialize && auth.initialize(app)
}
