var lib = module.exports;

var _config = require('./config'),
  Promise = require('bluebird'),
  logger = require('./logger'),
  processManager = require('./processManager'),
  child_process = require('child_process'),
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  md5 = require('md5')

lib.state = {
  started: "started",
  stoppped: "stopped",
  restarting: "restarting",
}

lib.getInstanceFromUrl = function (url) {

  // eg /red/<name>/?.*
  var userPathPrefix = _config.get('userPathPrefix', '')
  var userPathReg = userPathPrefix.replace(/\//g, '\\/')
  var regxstr = userPathReg + "\/([^/]+)";
  var res = url.match(new RegExp(regxstr))

  var instance;
  if(res && (instance = processManager.config(res[1]))) {
    return instance;
  }

  return null;
}

lib.isAdminUrl = function (url) {

  var adminPathPrefix = _config.get('adminPathPrefix', '')
  var adminPathReg = adminPathPrefix.replace(/\//g, '\\/')
  var regxstr = adminPathReg + "\/?.*";
  var res = url.match(new RegExp(regxstr))

  return res ? true : false;
}

lib.dbg = function () {
  _config.get('debug', false) && logger.debug.apply(logger.debug, arguments)
}

lib.silly = function () {
  _config.get('debug', false) && logger.silly.apply(logger.silly, arguments)
}

/**
 * List ports already listening in the system
 *
 * @todo filter by localhost
 *
 * @return {Promise}
 */
lib.getUsedPort = function () {
  return new Promise(function (ok, ko) {
    child_process.exec("netstat", ['-nat'], function (error, stdout, stderr) {

      if(error || stderr) {
        return ko(error || stderr)
      }

      var usedPorts = [];
      stdout.split("\n").forEach(function (line) {
        var res = line.match(/tcp[0-9]? *[0-9]* *[0-9]* *([^\:]+)\:([0-9]+) *.*\:[^ ]+ *([A-Z_]*)/)
        if(res) {
          //    console.log(res)
          usedPorts.push({
            address: res[1],
            port: res[2],
            status: res[3],
          })
        }
      })

      var lo = lib.getLocalhost()
      usedPorts = usedPorts.filter(function (element, index, array) {
        return element.address === lo ||
          element.address === 'localhost' ||
          element.address === '0.0.0.0' ||
          element.address === _config.get('localhost').bindHost;
      })

      ok(usedPorts)
    })
  })
}

lib.getLocalhost = function () {

  return(function () {

    var os = require('os')
    var ifaces = os.networkInterfaces()
    var loopback = null;

    Object.keys(ifaces).forEach(function (ifname) {
      ifaces[ifname].forEach(function (iface) {

        if(loopback) return;

        if('IPv4' !== iface.family || iface.internal !== false) {
          loopback = iface;
        }
      })

    })

    return loopback.address;
  })()
}

/**
 * Get first free port
 *
 * @return {Promise}
 */
lib.getPort = function () {

  return lib.getUsedPort().then(function (ports) {

    _config.config.basePort = _config.config.basePort || 3000;
    _config.config.basePort++;

    while(ports[_config.config.basePort]) {
      _config.config.basePort++;
      if(_config.config.basePort > 65000) {
        return Promise.reject(new Error("Cannot allocate port %s", _config.config.basePort))
      }
    }

    logger.debug("Selected port " + _config.config.basePort)
    return Promise.resolve(_config.config.basePort)
  })
}

lib.prepareConfig = function (name, config, opts) {

  opts = opts || {}

  if(typeof name === 'object') {
    config = name;
    name = config.name;
  }

  var pGetPort = (opts.reset || !config.port) ? lib.getPort() : Promise.resolve(config.port)
  return pGetPort.then(function (port) {

    var basePath = ""
    var uid = md5(name)

    config = config || {}

    var settings = {
      uiPort: null,
      flowFile: "flow.json",
      flowFilePretty: true,
      httpRoot: basePath,
      userDir: null,
      nodesDir: null,
      // no ui
      // httpAdminRoot: false
    }

    if(_config.get('paletteCategories')) {
      settings.paletteCategories = _config.get('paletteCategories')
    }

    var instanceConfig = {
      name: name,
      uid: uid,
      port: port,
      path: basePath,
      dir: null,
      settings: settings
    }

    _.merge(instanceConfig, config)

    // merge over fresh settings
    _.merge(instanceConfig.settings, settings)

    // update ports
    instanceConfig.port = port

    instanceConfig.created = instanceConfig.created || (new Date).toISOString()
    instanceConfig.updated = (new Date).toISOString()

    // keep track if the user requested to start|stop the instance
    instanceConfig.status = instanceConfig.status || lib.state.started

    logger.debug("Base config updated")

    return Promise.resolve(instanceConfig)
  })
}

lib.watchRedStartup = function (status, ok, ko) {

  var wait = 0,
    maxwait = 20;
  var timer

  clearTimer = function () {
    try {
      clearInterval(timer)
    } catch(e) {}
  }

  timer = setInterval(function () {

    if(status.redStarted) {
      clearTimer()
      logger.debug("node-red started")
      ok()
      return
    }

    wait++;
    if(wait > maxwait) {
      clearTimer()
      logger.warn("node-red has not start in time")
      ko(new Error("node-red has not start in time"))
    }

  }, 500)

}



lib.exists = function (src) {
  return new Promise(function (ok) {
    fs.exists(src, function(exists) {
      ok(exists)
    })
  })
}

lib.copyFile = function (source, target) {
  return new Promise(function (resolve, reject) {
    var _once = false
    var rd = fs.createReadStream(source)
    var _error = function (e) {
      if(!_once) {
        _once = true
        reject(e)
      }
    }
    rd.on('error', _error)
    var wr = fs.createWriteStream(target)
    wr.on('error', _error)
    wr.on('finish', resolve)
    rd.pipe(wr)
  })
}

lib.mkdir = Promise.promisify(fs.mkdir);
lib.writeFile = Promise.promisify(fs.writeFile);
lib.readlink = Promise.promisify(fs.readlink);
lib.symlink = Promise.promisify(fs.symlink);
lib.writeFile = Promise.promisify(fs.writeFile)

lib.getFlowFilePath = function (instance) {
  return _config.getInstanceDir(instance.uid) + '/flow.json'
}
