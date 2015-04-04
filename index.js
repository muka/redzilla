
var lib = module.exports;

lib.start = function(config, onReady) {

    if(typeof config === 'function') {
        onReady = config;
        config = {};
    }

    var serverManager = require('./lib/serverManager'),
        processManager = require('./lib/processManager'),
        logger = require('./lib/logger'),
        Promise = require('bluebird'),
        _config = require('./lib/config')
    ;
    
    if(typeof config === 'object') {
        _config.set(config);
    }

    serverManager.app().then(function(app) {

        onReady && onReady(app);

        return Promise.resolve();
    })
    .then(function() {

        logger.info("Reloading instances");

        return processManager.reload().then(function() {
            logger.info("Done");
            return Promise.resolve();
        });
    })
    .catch(function(e) {
        logger.error("An error occured during setup");
        logger.error(e);
    })
    .finally(function() {
        logger.info("Startup completed");
    });
};

lib.stop = function() {
    process.kill('SIGINT');
};

/**
 * @param {string} type auth name to be used in configuration
 * @param {function} callback the function handling the auth process
 */
lib.addAuth = function(type, callback) {
    require('./lib/auth').addType(type, callback);
};

/**
 * @param {string} type storage name to be used in configuration
 * @param {function} callback the function handling the storage process
 */
lib.addStorage = function(type, callback) {
    require('./lib/storage').addType(type, callback);
};