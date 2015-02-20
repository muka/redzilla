
var config = {

    host: {
        port: process.env.PORT || 3000,
        ip: process.env.HOST || 'localhost'
    },

    admin: {
        user: 'admin',
        pass: 'admin'
    },

    debug: true,

    hash: 'change to a very secret hash',

    auth: 'basic',
    storage: 'file',

    userPathPrefix: "/red",
    adminPathPrefix: "/admin",

    instancesDir: "./instances",
    basePort: 3002
};

var loadConfig = function() {

    var userConfig = {};
    try {
        userConfig = require('../config.json');
    }
    catch(e) {
        console.warn("Error loading config.json file", e);
    }

    for(var i in userConfig) {
        config[ i ] = userConfig[ i ];
    }

    return config;
};

module.exports.config = loadConfig();

module.exports.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return module.exports.config[ conf ] === undefined ? defaultVal : module.exports.config[ conf ];
};

module.exports.set = function(conf, val) {
    module.exports.config[ conf ] = val;
};