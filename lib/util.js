
var lib = module.exports;

var _config = require('./config'),
    Promise = require('bluebird'),
    logger = require('./logger'),
    processManager = require('./processManager'),
    child_process = require('child_process')
;

lib.getInstanceFromUrl = function(url) {

    // eg /red/<name>/?.*
    var userPathPrefix = _config.get('userPathPrefix', '');
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

    var adminPathPrefix = _config.get('adminPathPrefix', '');
    var adminPathReg = adminPathPrefix.replace(/\//g, '\\/');
    var regxstr = adminPathReg + "\/?.*";
    var res = url.match(new RegExp(regxstr));

    return res ? true : false;
};

lib.dbg = function() {
    _config.get('debug', false) && logger.debug.apply(logger.debug, arguments);
};

lib.silly = function() {
    _config.get('debug', false) && logger.silly.apply(logger.silly, arguments);
};

/**
 * List ports already listening in the system
 *
 * @todo filter by localhost
 *
 * @return {Promise}
 */
lib.getUsedPort = function () {
    return new Promise(function (ok, ko) {
        child_process.exec("netstat", ['-nat'], function (error, stdout, stderr) {

            if (error || stderr) {
                return ko(error || stderr);
            }

            var usedPorts = [];
            stdout.split("\n").forEach(function (line) {
                var res = line.match(/tcp *[0-9]* *[0-9]* *([^\:]+)\:([0-9]+) *.*\:[^ ]+ *([A-Z]*)/);
                if (res) {
//                    console.log(res);
                    usedPorts.push({
                        address: res[1],
                        port: res[2],
                        status: res[3],
                    });
                }
            });


            var lo = lib.getLocalhost();
            usedPorts = usedPorts.filter(function(element, index, array) {
                return element.address === lo ||
                        element.address === 'localhost' ||
                        element.address === '0.0.0.0';
            });

            ok(usedPorts);

        });
    });
};

lib.getLocalhost = function () {

    return (function () {

        var os = require('os');
        var ifaces = os.networkInterfaces();
        var loopback = null;

        Object.keys(ifaces).forEach(function (ifname) {
            ifaces[ifname].forEach(function (iface) {

                if(loopback) return;

                if ('IPv4' !== iface.family || iface.internal !== false) {
                    loopback = iface;
                }
            });

        });

        return loopback.address;
    })();
};

/**
 * Get first free port
 *
 * @return {Promise}
 */
lib.getPort = function () {

    return lib.getUsedPort().then(function (ports) {
        
        _config.config.basePort = _config.config.basePort || 3000;
        _config.config.basePort++;

        while (ports[ _config.config.basePort ]) {
            _config.config.basePort++;
            if (_config.config.basePort > 65000) {
                return Promise.reject(new Error("Cannot allocate port " + _config.config.basePort));
            }
        }

        logger.debug("Selected port " + _config.config.basePort);
        return Promise.resolve(_config.config.basePort);
    });
};
