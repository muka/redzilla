
module.exports.config = {

    host: {
        port: process.env.PORT || 3000,
        ip: process.env.HOST || 'localhost'
    },

    instancesDir: "./instances",
    basePort: 3002
};


module.exports.get = function(conf, defaultVal) {
    defaultVal = defaultVal === undefined ? null : defaultVal;
    return module.exports.config[ conf ] === undefined ? defaultVal : module.exports.config[ conf ];
};

module.exports.set = function(conf, val) {
    module.exports.config[ conf ] = val;
};