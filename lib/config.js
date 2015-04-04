
var _ = require('underscore');

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

    auth: null,
    storage: 'file',
    process: 'localhost',

    userPathPrefix: "/red",
    adminPathPrefix: "/admin",

    instancesDir: "/tmp",
    basePort: 3002
};

var loadConfig = function() {

    var userConfig = {};
    try {
        userConfig = require('../config.json');
    }
    catch(e) {}
    
    _.extend(config, userConfig);
    
    return config;
};

module.exports.config = loadConfig();

module.exports.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return module.exports.config[ conf ] === undefined ? defaultVal : module.exports.config[ conf ];
};

module.exports.set = function(conf, val) {
    if(typeof conf === 'object') {
        module.exports.config = _.extend(module.exports.config, conf);
    }
    else {
        module.exports.config[ conf ] = val;
    }
};