
var _ = require('lodash'),
    path = require('path')
    ;

var lib = module.exports;

var config = {

    baseUrl: null,

    host: {
        port: process.env.PORT || 3000,
        ip: process.env.HOST || 'localhost'
    },

    admin: {
        user: 'admin',
        pass: 'admin'
    },

    debug: true,

    basePort: 3002,
    hash: 'change to a very secret hash',

    createOnRequest: true,

    cacheFileName: "cache.json",

    instancesDir: path.resolve(__dirname + "/../instances"),
    nodesDir: path.resolve(__dirname + "/../custom-nodes"),
    redPath: null,

    auth: null,
    storage: 'file',
    process: 'localhost',

    userPathPrefix: "/red",
    adminPathPrefix: "/admin",
    
    settings: {},
            
    docker: {

        socketPath: '/var/run/docker.sock',
        image: 'muka/redzilla',

        // @MEMO keep in sync with docker/Dockerfile
        volumes: {
            nodesDir: '/nodes',
            userDir: '/user',
//            flowFile: "/node-red/flow.json",
            settingsFile: "/node-red/settings.js"
        }
    }

};

var loadConfig = function() {

    var userConfig = {};
    try {
        userConfig = require('../config.json');
    }
    catch(e) {}

    return _.merge(config, userConfig);
};

lib.config = loadConfig();

lib.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return lib.config[ conf ] === undefined ? defaultVal : lib.config[ conf ];
};

lib.set = function(conf, val) {
    if(typeof conf === 'object') {
        lib.config = _.merge(lib.config, conf);
    }
    else {
        lib.config[ conf ] = val;
    }
};

lib.getInstancesDir = function() {
    return config.instancesDir || path.resolve(_dirname + '../instances/');
}

lib.getRedPath = function() {
    return lib.config.redPath || path.resolve(__dirname + '/../../node_modules/node-red');
};

lib.getUserDir = function() {
    return lib.config.userDir;
}

lib.getNodesDir = function() {
    return lib.config.nodesDir;
}

lib.getInstancesCacheFile = function() {
    return lib.config.cacheFileName || "cache.json";
};