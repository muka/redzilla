
var _ = require('lodash'),
    path = require('path')
    ;

var lib = module.exports;

var config = {}

var loadConfig = function(cfg) {

    cfg = cfg || {}

    var defaultConfig = {}
    try {
        defaultConfig = require('../config.default.json');
    }
    catch(e) {
        console.warn("Error loading default config: %s", e.message)
    }

    config = _.assign(defaultConfig, cfg)
    return config
};

lib.config = loadConfig();

lib.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return lib.config[ conf ] === undefined ? defaultVal : lib.config[ conf ];
}

lib.set = function(conf, val) {
    if(typeof conf === 'object') {
        _.assign(lib.config, conf)
    }
    else {
        lib.config[ conf ] = val;
    }
}

lib.getRedPath = function() {
    return lib.config.redPath || path.resolve(__dirname + '/../node-red');
}

lib.getProcessConfig = function() {
    return lib.config[lib.config.process] ? lib.config[lib.config.process] : {}
}

lib.getInstanceDir = function(uid) {
    return lib.getInstancesDir() + (uid ? '/' + uid : '')
}

lib.getInstancesDir = function(uid) {
    return lib.get('instancesDir') + '/'
}

lib.getNodesDir = function() {
    return lib.get('nodesDir') + '/'
}
