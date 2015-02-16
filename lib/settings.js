
var lib = module.exports;

lib.defaults = require('node-red/settings');

lib.saveSettingsFile = function(dir, opts) {
    require('fs').writeFileSync(dir + "/settings.js", lib.getSettingsFile(opts));
};

lib.getSettingsFile = function(opts) {
    var content = "module.exports = " + lib.getConfig(opts, true) + ";"
    return content;
};

lib.getConfig = function(opts, asString) {

    opts = opts || {};

    var obj = {};

    for(var i in module.exports.defaults) {
        obj[i] = module.exports.defaults[i];
    }

    for(var i in opts) {
        obj[i] = opts[i];
    }

    return asString ? JSON.stringify(obj, null, 2) : obj;
};





