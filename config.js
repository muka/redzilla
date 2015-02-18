
module.exports.config = {

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

    instancesDir: "/tmp/redzilla-instances",
    basePort: 3002
};


module.exports.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return module.exports.config[ conf ] === undefined ? defaultVal : module.exports.config[ conf ];
};

module.exports.set = function(conf, val) {
    module.exports.config[ conf ] = val;
};