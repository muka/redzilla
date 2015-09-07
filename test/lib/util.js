
var redzilla = require('../../index')
var assert = require("assert")
var Promise = redzilla.Promise

var fs = require('fs')
var cp = require('child_process')
var rp = require('request-promise')

var lib = module.exports

lib.baseUrl = function (auth) {

    var host = redzilla.getConfig().get('host')

    var uri = host.ip + ':' + host.port

    if(auth === 'basic') {
        var admin = redzilla.getConfig().get('admin')
        uri = admin.user + ':' + admin.pass + '@' + uri
    }

    return 'http://' + uri
}

lib.adminUrl = function (auth) {
    return lib.baseUrl(auth) + redzilla.getConfig().get('adminPathPrefix')
}

lib.instanceUrl = function (name, op, auth) {
    name = name || ('instance' + (new Date).getTime())
    op = op || 'status'
    return lib.adminUrl(auth) + '/' + name + '/' + op
}

lib.cleanup = function() {

    var instancesDir = require('path').resolve(redzilla.getConfig().getInstancesDir())
    var cacheFile = instancesDir + '/cache.json'
    var cache = require(cacheFile)

    var rmdir = function (path) {

        return new Promise(function (ok, ko) {
            var fullpath = require('path').resolve(path)

            if(!fs.existsSync(fullpath)) return ok()

            var p = cp.exec('rm -r '+ fullpath, function(err, a, b) {
                // the callback seems not being called
                console.warn(err)
            })

            // go on anyway
            ok()
        })
    }

    var _k = Object.keys(cache)

    if(!_k.length) return Promise.resolve()

    Promise.all(_k).each(function (name) {
        if(!cache[name] || !cache[name].uid) return Promise.resolve()
        return rmdir(instancesDir + '/' + cache[name].uid)
    })
    .then(function() {
        redzilla.getStorageManager().remove(redzilla.getConfig().getInstancesCacheFile())
        return Promise.resolve()
    })

}
