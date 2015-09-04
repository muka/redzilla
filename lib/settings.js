
var lib = module.exports

lib.saveSettingsFile = function(dir, opts) {
    require('fs').writeFileSync(dir + "/settings.js", lib.getSettingsFile(opts))
}

lib.getSettingsFile = function(opts) {
    var content = "module.exports = " + lib.getConfig(opts, true) + ";"
    return content
}

lib.getConfig = function(opts, asString) {

    opts = opts || {}
    var obj = {}

    var _config = require('./config')
    var _ = require('lodash')

    var defaults = require(_config.getRedPath() + '/settings')

    obj = _.assign(obj, defaults)
    obj = _.assign(obj, opts)

    return asString ? JSON.stringify(obj, null, 2) : obj
}
