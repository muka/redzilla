
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
    hash: 'change to a very secret hash, not like ' + (new Date).getTime(),

    createOnRequest: true,

    cacheFileName: "cache.json",

    instancesDir: path.resolve(__dirname + "/../instances"),
    nodesDir: path.resolve(__dirname + "/../custom-nodes"),
    redPath: null,

    auth: 'basic',
    storage: 'file',
    process: 'localhost',

    userPathPrefix: "/red",
    adminPathPrefix: "/admin",

    paletteCategories: ['subflows', 'input', 'output', 'function', 'social', 'storage', 'analysis', 'advanced'],

    settings: {},

    localhost: {
        basePort: 3002,
        nodesDir: './custom-nodes',
        userDir: './instances',
//            flowFile: "/node-red/flow.json",
        settingsFile: "./instances/settings.js"
    },

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
}

lib.getInstancesDir = function() {

    var dir = config.instancesDir || './instances/'

    if(dir.substr(0, 1) === '/' && dir.substr(1, 1) !== '.')
        return dir

    return path.resolve(__dirname + '/../' + dir)
}

lib.getInstanceDir = function(uid) {
    return path.resolve(lib.getInstancesDir() + '/' + uid);
}

lib.getRedPath = function() {
    return lib.config.redPath || path.resolve(__dirname + '/../node_modules/node-red');
}

lib.getUserDir = function() {
    return lib.config.userDir;
}

lib.getNodesDir = function() {
    return lib.config.nodesDir;
}

lib.getInstancesCacheFile = function() {
    return lib.config.cacheFileName || "cache.json";
}

lib.getProcessConfig = function() {
    return lib.config[lib.config.process] ? lib.config[lib.config.process] : {}
}
