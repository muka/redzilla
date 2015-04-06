
var winston = require('winston');
winston.emitErrs = true;

var defaultLogger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: __dirname + '/../logs/all-logs.log',
//            handleExceptions: true,
            handleExceptions: false,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.Console({
            level: 'debug',
//            handleExceptions: true,
            handleExceptions: false,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = defaultLogger;

var instances = {};

module.exports.instance = function(name) {

    var processManager = require('./processManager');

    // avoid warning from EventEmitter
    process.setMaxListeners(10 + (Object.keys(instances).length+1));

    if(!instances[ name ]) {

        var config = processManager.config(name);

        if(!config || !config.dir) {

            defaultLogger.warn("Directory not set for instance " + name + ", using default log");
            return defaultLogger;
        }

        instances[ name ] = new winston.Logger({
            transports: [
                new winston.transports.File({
                    level: 'debug',
                    filename: config.dir + '/red.log',
//                    handleExceptions: true,
                    handleExceptions: false,
                    json: false,
                    maxsize: 7628640, //15MB
                    maxFiles: 1,
                    colorize: false
                })
            ],
            exitOnError: false
        });
    }

    return instances[ name ];
};
