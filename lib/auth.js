
var lib = module.exports;

var logger = require("./logger"),
    processManager = require("./processManager"),
    config = require("../config"),
    Promise = require("bluebird")
;

var types = {
    basic: require('./auth/basic')
};

lib.addType = function(type, callback) {
    types[ type ] = callback;
};

lib.handler = function(req, res, next) {

    logger.debug("Checking auth for " + req.url);

    var type = config.get('auth', 'basic');

    if(types[ type ] === undefined) {
        throw new Error("Auth type " + type + " is not available");
        return res.send(500);
    }

    var auth = types[ type ];
    auth.handler(req, res, next);
};