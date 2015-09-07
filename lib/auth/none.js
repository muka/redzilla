var basicAuth = require('basic-auth')
    ,fs = require('fs')
    ,md5 = require('md5')
    ,util = require('../util')
    ,config = require('../config')

var lib = module.exports

lib.handler = function (req, res, next) {
    next()
}
