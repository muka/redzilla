
module.exports.start = function(onReady) {

    var serverManager = require('./lib/serverManager'),
        processManager = require('./lib/processManager'),
        logger = require('./lib/logger'),
        Promise = require('bluebird')
    ;

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