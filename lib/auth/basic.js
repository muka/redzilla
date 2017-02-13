var basicAuth = require('basic-auth')
    ,fs = require('fs')
    ,md5 = require('md5')
    ,util = require('../util')
    ,config = require('../config')


var cache = {}
var lib = module.exports


lib.handler = function (req, res, next) {

    var logger = require('../logger')

    var unauthorized = function () {
        logger.silly("Not allowed")
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
        return res.sendStatus(401)
    }

    var authorized = function () {
        logger.silly("Allowed")
        return next()
    }

    var instance = util.getInstanceFromUrl(req.url)
    var isAdminPath = util.isAdminUrl(req.url)

    if(!isAdminPath && !instance) {
        logger.silly("Not an admin path nor instance detected")
        return authorized()
    }

    var user = basicAuth(req)
    if(!user || !user.name || !user.pass) {
        logger.silly("Account data not provided")
        return unauthorized()
    }

    if(isAdminPath) {
        logger.silly("Admin pages authentication of %s", user.name)
        return lib.authRoot(user) ? authorized() : unauthorized()
    }
    else if(instance) {
        logger.silly("Authentication of %s on instance %s", user.name, instance.name)
        return lib.authRoot(user) || lib.authInstance(instance, user) ? authorized() : unauthorized()
    }

}

lib.authRoot = function (user) {
    var root = config.get('admin', null)
    return root === null || (root.user === user.name && root.pass === user.pass)
}

lib.authInstance = function (instance, user) {

    var logger = require('../logger')

    if(!instance) {
        return false;
    }

    var valid = false;
    var users = lib.getUsers(instance)

    if(!Object.keys(users).length) {
        lib.addUser(instance, "admin", instance.name)
        logger.warn("Added fake user %s:%s", "admin", instance.name)
    }

    if(users[user.name] && users[user.name] === lib.getPasswd(user.pass)) {
        valid = true;
    }

    return valid;
}

lib.getUsers = function (instance) {

    if(cache[instance.name]) {
        return cache[instance.name];
    }

    return lib.loadAuthFile(instance)
}

lib.getPasswd = function (plain) {
    return md5(config.get('hash', "quando partisti, come son rimasta! come l'aratro in mezzo alla maggese.") + plain)
}

lib.addUser = function (instance, name, pass) {
    var users = lib.getUsers(instance)
    users[name] = lib.getPasswd(pass)
    lib.saveAuthFile(instance, users)
}

lib.loadAuthFile = function (instance) {

    var authFile = lib.authFilename(instance)

    if(!fs.existsSync(authFile)) {
        var users = cache[instance.name] || {}
        lib.saveAuthFile(instance, users)
    }

    var content = fs.readFileSync(authFile)
    cache[instance.name] = JSON.parse(content)

    return cache[instance.name];
}

lib.saveAuthFile = function (instance, list) {
    var authFile = lib.authFilename(instance)
    fs.writeFileSync(authFile, JSON.stringify(list))
}

lib.authFilename = function (instance) {
    return instance.dir + '.auth.json';
}
