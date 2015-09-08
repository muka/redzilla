

var Promise = require('bluebird')
    ,fs = require('fs')
    ,storage = require('../storage')
    ,config = require('../config')
    ,path = require('path')
    ,logger = require('../logger')
;

var lib = module.exports;

var getPath = function(key, meta) {
    meta = meta || {}
    var baseDir = meta.baseDir || config.getInstancesDir() || './'
    if(baseDir.substr(baseDir.length -1) !== '/' && key.substr(0, 1) !== '/')
      baseDir = baseDir + '/'
    return path.resolve(baseDir + key)
}

lib.setup = function() {
    return Promise.resolve()
}

lib.remove = function(key) {
    return new Promise(function(ok, ko) {
        var exec = require('child_process').execFile
        exec('rm', [getPath(key)], function (err, stdout, stderr) {
            if(err) return ko(err)
            ok()
        })
    })
}

lib.write = function(key, content, meta) {
    var filePath = getPath(key, meta)
    logger.debug("Write file %s", filePath)
    return new Promise(function(ok, ko) {
        fs.writeFile(filePath, content, function(err) {
            if(err) return ko(err)
            return ok()
        })
    })
}

lib.read = function(key, meta) {

    var filePath = getPath(key, meta)

    logger.debug("Read file %s", filePath)

    return new Promise(function(ok, ko) {
        fs.exists(filePath, function(exists) {

            if(!exists) {
                var ex = new storage.FileNotFoundError("File "+ key +" doesn't exists")
                return ko(ex)
            }

            fs.readFile(filePath, 'utf8', function (err, data) {
                (err) ?  ko(err) : ok(data)
            })

        })
    })
}
