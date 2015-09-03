
var Promise = require('bluebird')

var lib = module.exports;

lib.Promise = Promise

lib.start = function(config, onReady) {

    if(typeof config === 'function') {
        onReady = config;
        config = {}
    }

    var serverManager = require('./lib/serverManager'),
        processManager = require('./lib/processManager'),
        logger = require('./lib/logger'),
        Promise = require('bluebird'),
        _config = require('./lib/config')
    ;

    if(typeof config === 'object') {
        _config.set(config)
    }

    return serverManager.app().then(function(app) {

        onReady && onReady(app)

        return Promise.resolve()
    })
    .then(function() {

        logger.info("Reloading instances")

        return processManager.reload().then(function() {
            logger.info("Done")
            return Promise.resolve()
        })
    })
    .catch(function(e) {
        logger.error("An error occured during setup")
        logger.error(e)
    })
    .finally(function() {
        logger.info("Startup completed")
    })
}

lib.stop = function() {
    process.kill('SIGINT')
}

/**
 * @param {string} type auth name to be used in configuration
 * @param {function} callback the function handling the auth process
 */
lib.addAuth = function(type, callback) {
    require('./lib/auth').addType(type, callback)
}

/**
 * @param {string} type storage name to be used in configuration
 * @param {function} callback the function handling the storage process
 */
lib.addStorage = function(type, callback) {
    require('./lib/storage').addType(type, callback)
}

lib.getServer = function() {
    return require('./lib/serverManager')
}

lib.getProcessManager = function() {
    return require('./lib/processManager')
}

lib.getStorageManager = function() {
    return require('./lib/storage')
}

lib.getConfig = function() {
    return require('./lib/config')
}

lib.getAuthManager = function() {
    return require('./lib/auth')
}

lib.getLogger = function() {
    return require('./lib/logger')
}

lib.setLogger = function(logger) {
    require('./lib/logger').setLogger(logger)
}


/**
 * Return an object rapresenting a node-red instance
 *
 * @param String id instance uniq id
 * @throws Error If instance has not been found
 * @return RedInstance instance of node-red
 */
lib.instance.get = function(uid) {

    var pm = lib.getProcessManager()

    if(!pm.exists(uid)) {
        throw new Error("Instance not found")
    }

    return new RedInstance(uid)
}

lib.instance.add = function(name, config) {
    return lib  .getProcessManager()
                .create(name, config)
                .then(function(instanceConfig) {
                    return Promise.resolve( lib.instances.get(instanceConfig.uid) )
                })
}

lib.instances.list = function() {

    var pm = lib.getProcessManager()
    var instances = pm.getInstances()

    return Object.keys(instances).map(function(uid) {
        return new pm.RedInstance(uid)
    })
}
