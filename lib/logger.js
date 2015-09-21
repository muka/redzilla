
var winston = require('winston');
winston.emitErrs = true;

var config = require('./config')

var defaultLogger = new winston.Logger({
    // transports: [],
    exitOnError: false
});

if(config.get('fileLog') || config.get('fileLog') === undefined ) {
    var logFile = config.get('fileLogPath') || __dirname + '/../logs/all-logs.log'
    defaultLogger.add(winston.transports.File, {
        level: config.get('fileLogLevel'),
        filename: logFile,
        handleExceptions: false,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false
    })
}

if(config.get('consoleLog') || config.get('consoleLog') === undefined ) {
    defaultLogger.add(winston.transports.Console, {
        level: config.get('consoleLogLevel', 'debug'),
    //            handleExceptions: true,
        handleExceptions: false,
        json: false,
        colorize: true
    })
}

var instances = {};

var setLogger = function(logger) {
    module.exports = logger;
    module.exports.instance = instance;
    module.exports.setLogger = setLogger;
};

var instance = function(name) {

    var processManager = require('./processManager');

    // avoid warning from EventEmitter
    process.setMaxListeners(10 + (Object.keys(instances).length+1));

    if(!instances[ name ]) {

        var config = processManager.config(name);

        if(!config || !config.dir) {

            defaultLogger.warn("Directory not set for instance " + name + ", using default log");
            return defaultLogger;
        }

        var _transports = [
            new winston.transports.File({
                level: 'debug',
                filename: config.dir + '/red.log',
                handleExceptions: true,
                json: false,
                maxsize: 7628640, //15MB
                maxFiles: 1,
                colorize: false
            })
        ];

        if(require('./config').config.debug) {
            _transports.push(
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    json: false,
                    colorize: true
                })
            );
        }

        instances[ name ] = new winston.Logger({
            transports: _transports,
            exitOnError: false
        });
    }

    return instances[ name ];
};

setLogger(defaultLogger);
