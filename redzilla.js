
module.exports.start = function() {

    var serverManager = require('./lib/serverManager'),
        processManager = require('./lib/processManager'),
        logger = require('./lib/logger'),
        Promise = require('bluebird')
    ;

    serverManager.app().then(function(app) {

        app.get('/', function (req, res) {

            var content = [];

            content.push("<p>Gimme a red</p><ul>");
            content.push("<li><a href='/Topolino' target='_blank'>Topolino</a></li>");
            content.push("<li><a href='/Pluto' target='_blank'>Pluto</a></li>");
            content.push("</ul>");

            res.send(content.join(''));
        });

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