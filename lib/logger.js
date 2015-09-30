
var winston = require('winston')
winston.emitErrs = true;

var config = require('./config')

var defaultLogger = new winston.Logger({
    // transports: [],
    exitOnError: false
})

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

var instances = {}

var instance = function(name) {

    var cfg = require('./config')
    var processManager = require('./processManager')

    // avoid warning from EventEmitter
    process.setMaxListeners(10 + (Object.keys(instances).length+1))

    if(!instances[ name ]) {

        var instance = processManager.config(name)

        if(!instance || !instance.dir) {
            defaultLogger.warn("Directory not set for instance %s, using default log", name)
            return defaultLogger;
        }

        var _transports = [
            new winston.transports.File({
                level: 'debug',
                filename: cfg.getInstanceDir(instance.uid) + '/red.log',
                handleExceptions: true,
                json: false,
                maxsize: 7628640, //15MB
                maxFiles: 1,
                colorize: false
            })
        ]

        if(cfg.config.debug) {
            _transports.push(
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    json: false,
                    colorize: true
                })
            )
        }

        instances[ name ] = new winston.Logger({
            transports: _transports,
            exitOnError: false
        })
    }

    return instances[ name ]
}


var setLogger = function(logger) {
    module.exports = logger
    module.exports.instance = instance
    module.exports.setLogger = setLogger
}

setLogger(defaultLogger)
