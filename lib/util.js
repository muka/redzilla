
var lib = module.exports;

var config = require('../config'),
    Promise = require('bluebird'),
    logger = require('./logger'),
    processManager = require('./processManager')
;


lib.getInstanceFromUrl = function(url) {

    // eg /red/<name>/?.*
    var userPathPrefix = config.get('userPathPrefix', '/red');
    var userPathReg = userPathPrefix.replace(/\//g, '\\/');
    var regxstr = userPathReg + "\/([^/]+)";
    var res = url.match(new RegExp(regxstr));

    var instance;
    if(res && (instance = processManager.config(res[1]))) {
        return instance;
    }

    return null;
};

lib.isAdminUrl = function(url) {

    var adminPathPrefix = config.get('adminPathPrefix', '/admin');
    var adminPathReg = adminPathPrefix.replace(/\//g, '\\/');
    var regxstr = adminPathReg + "\/?.*";
    var res = url.match(new RegExp(regxstr));

    return res ? true : false;
};

lib.dbg = function() {
    config.get('debug', false) && logger.debug.apply(logger.debug, arguments);
};
