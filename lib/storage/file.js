

var Promise = require('bluebird'),
    fs = require('fs'),
    storage = require('../storage'),
    config = require('../config'),
    path = require('path'),
    logger = require('../logger')
;

var lib = module.exports;

var getPath = function(key) {
    return path.resolve(config.get('file').baseDir + "/" + key)
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

lib.write = function(key, content) {

    var filePath = getPath(key)
    logger.debug("Write file %s", filePath)

    return new Promise(function(ok, ko) {
        fs.writeFile(filePath, content, function(err) {
            if(err) return ko(err)
            return ok()
        })
    })
}

lib.read = function(key) {

    var filePath = getPath(key)

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
