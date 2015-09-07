
var redzilla = require('../index')
var assert = require("assert")
var path = require("path")

var Promise = redzilla.Promise

var rp = require('request-promise')

var baseUrl = function (auth) {

    var host = redzilla.getConfig().get('host')

    var uri = host.ip + ':' + host.port

    if(auth === 'basic') {
        var admin = redzilla.getConfig().get('admin')
        uri = admin.user + ':' + admin.pass + '@' + uri
    }

    return 'http://' + uri
}

var adminUrl = function (auth) {
    return baseUrl(auth) + redzilla.getConfig().get('adminPathPrefix')
}

var instanceUrl = function (name, op, auth) {
    name = name || ('instance' + (new Date).getTime())
    op = op || 'status'
    return adminUrl(auth) + '/' + name + '/' + op
}

after(function (done) {

    var instancesDir = path.resolve( redzilla.getConfig().getInstancesDir() )
    var cache = require(instancesDir + '/cache.json')

    var rmdir = function (path) {
        var exec = require('child_process').exec;
        return new Promise(function (ok, ko) {
            exec('rm -r ' + require('path').resolve(path), function (err, stdout, stderr) {
                if(err) return ko(err)
                ok()
            })
        })
    }

    var _k = Object.keys(cache)
    if(_k.length) {
        Promise.all(_k).each(function (name) {
            if(!cache[name] || !cache[name].uid) return Promise.resolve()
            return rmdir(instancesDir + '/' + cache[name].uid)
        })
        .then(function() {
            require('fs').unlinkSync(instancesDir + '/cache.json')
            done()
        })
        .catch(function(e) {
            var m = "Err cleaning up"
            console.warn(m, e)
            done(new Error(e.message || m))
        })
    }
    else done()

})

describe('redzilla', function () {
    describe('startup', function () {
        it('should startup with default configurations', function (done) {

            redzilla.start()
                .then(function () {
                    done()
                })
                .catch(done)
        })
    })
    describe('auth', function () {
        it('should require basic auth', function (done) {

            rp({
                uri: instanceUrl('test', 'status'),
                method: 'GET'
            }).then(function (r) {
                done(new Error("Should disallow access!"))
            }).catch(function (e) {
                assert(e.statusCode === 401)
                done()
            })

        })
        it('should authenticate', function (done) {

            rp({
                uri: instanceUrl('test', 'status', 'basic'),
                method: 'GET',
            }).then(function (r) {
                done()
            }).catch(done)

        })
    })
    describe('stop', function () {
        it('should stop managers and exit afterwards', function (done) {
            redzilla.stop().then(done).catch(done)

        })
    })
})
