var _ = require('lodash'),
    path = require('path')

var lib = module.exports

var config = {}

var loadConfig = function (cfg) {

    cfg = cfg || {}

    var defaultConfig = {}
    try {
        defaultConfig = require('../config.default.js')
    } catch(e) {
        console.warn('Error loading default config: %s', e.message)
    }

    _.assign(config, defaultConfig, cfg)
    return config
}

lib.config = loadConfig()

lib.get = function (conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal
    return lib.config[conf] === undefined ? defaultVal : lib.config[conf]
}

lib.set = function (conf, val) {
    if(typeof conf === 'object') {
        _.merge(lib.config, conf)
    } else {
        lib.config[conf] = val
    }
}

lib.getRedPath = function () {
    return lib.config.redPath || path.resolve(__dirname + '/../node_modules/node-red')
}

lib.getProcessConfig = function () {
    return lib.config[lib.config.process] ? lib.config[lib.config.process] : {}
}

lib.getInstanceDir = function (uid) {
    return uid ? path.join(lib.getInstancesDir(), uid) : lib.getInstancesDir()
}

lib.getInstancesDir = function () {
    return lib.get('file').instancesDir
}

lib.getNodesDir = function () {
    return lib.get('file').nodesDir
}

lib.getCacheFile = function () {
    return lib.get('file').cacheFileName
}
