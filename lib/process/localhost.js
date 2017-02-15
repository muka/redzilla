
/**
 * @deprecated
 * This process management module is deprecated, which can be read as `not maintained`
 */

throw new Error('localhost/port based process management is not supported anymore.')

var  _config = require('../config'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  child_process = require('child_process'),
  logger = require('../logger'),
  path = require('path'),
  util = require('../util'),
  storage = require('../storage')

var lib = module.exports

var instances = {}
var options = {}
var processes = {}

var red_linkables = [
  'node_modules',
  'bin',
  'nodes',
  'locales',
  'editor',
  'public',
  'red',
  'package.json',
    // "red.js",
    // "settings.js",
]

var getConfig = function () {
  return _config.getProcessConfig()
}

lib.getInstances = function () {
  return instances
}

/**
 * Setup filesystem directory and related files
 *
 * @param {string} dir container directory
 * @param {object} settings configuration object
 * @return {Promise}
 */
lib.setup = function (config) {

  var dir = config.dir
  var settings = config.settings

  var instanceDir = _config.getInstanceDir(config.uid)

  logger.silly('Instance setup')
  return util.exists(instanceDir)
    .then(function (yes) {
      if(yes) return Promise.resolve()
      logger.silly('Create dir %s', instanceDir)
      return util.mkdir(instanceDir, 0x777)
    })
    .then(function () {
      var flowFile = util.getFlowFilePath(config)
      return util.exists(flowFile).then(function (yes) {
        if(yes) return Promise.resolve()
        logger.silly('Write empty flow file %s', flowFile)
        return storage.writeFlowFile(config, '[]')
      })
    })
    .then(function () {
      return storage.writeSettingsFile(config)
    })
    .then(function () {
      return Promise.all(red_linkables).each(function (filename) {

        var src = path.resolve(_config.getRedPath() + '/' + filename + '/')
        var dst = path.resolve(config.dir + '/' + filename + '/')

        return util.exists(src)
            .then(function (yes) {
              if(yes) return Promise.resolve()
              return Promise.reject('Cannot link ' + src + ': does not exists')
            })
            .then(function () {
              return util.readlink(dst)
                .then(function () {
                  return Promise.resolve()
                })
                .catch(function () {
                  logger.silly('link %s -> %s', src, dst)
                  return util.symlink(src, dst)
                })
            })
      })
        .then(function () {
          var src = _config.getRedPath() + '/red.js'
          var dst = path.resolve(dir + '/red.js')
          return util.exists(dst)
            .then(function (yes) {
              if(yes) return Promise.resolve()
              logger.silly('copy %s -> %s', src, dst)
              return util.copyFile(src, dst)
            })

        })
    })
}


/**
 * Return a reference to a log
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.logs = function (name) {
  return new Promise(function (ok, ko) {

    if(!lib.exists(name)) {
      return ko(new Error('Instance not found'))
    }

    var config = lib.config(name)
    var userDir = path.resolve(_config.getInstanceDir(config.uid))

    var logDir = path.resolve(userDir + '/red.log')
    logger.debug('Opening log stream %s', logDir)

    var logStream = fs.createReadStream(logDir)

    logStream.on('open', function () {
      ok(logStream)
    })

  })
}

/**
 * Return instance configuration by name
 *
 * @param {string} name instance name
 */
lib.config = function (name) {
  return instances[name]
}

/**
 * Return instance runtime options by name
 *
 * @param {string} name instance name
 */
lib.options = function (name) {
  if(options[name] === undefined || options[name] === null) {
    options[name] = {}
  }
  return options[name]
}

/**
 * Return instance sub-process by name
 *
 * @param {string} name instance name
 */
lib.process = function (name) {
  return processes[name]
}

lib.prepareConfig = function (name, iconf, opts) {
  return util.prepareConfig(name, iconf, opts).then(function (conf) {

    conf.dir = conf.settings.userDir = _config.getInstanceDir(conf.uid)
    conf.settings.nodesDir = _config.getNodesDir()
    conf.settings.uiPort = conf.port

    conf.host = conf.settings.uiHost = getConfig().bindHost || '127.0.1.1'

    logger.debug(JSON.stringify(conf))

    return Promise.resolve(conf)
  })
}

/**
 * Starts a new instance based on provided configurations
 *
 * @param {object} config instance configurations
 * @return {Promise}
 */
lib.start = function (config) {

  if(typeof config !== 'object' || config.name === undefined) {
    return ko(new Error('start requires a valid config object'))
  }

  var name = config.name
  instances[name] = config

  return lib.setup(config)
    .catch(function (e) {
      logger.error('Setup error: %s', e.message)
      logger.error(e)
      return Promise.reject(e)
    })
    .then(function () {
      return new Promise(function (ok, ko) {

        logger.info('Process info', instances[name])

        try {

          config.started = (new Date).toISOString()

          var child = child_process.spawn('node', ['red'], {
            'cwd': config.dir
          })
          processes[name] = child

          var processLogger = logger.instance(name)

          var _redStatus = {
            name: name,
            redStarted: false
          }

          child.stdout.on('data', function (data) {

            data.toString('utf8').split('\n').forEach(function (line) {

              var all_line = data.toString().replace('\n', '')
              if(all_line.match(/.*Started.flows.*/i)) {
                _redStatus.redStarted = true
              }

              if(line.replace(' ', '').length)
                processLogger.debug(line)
            })

          })

          child.stderr.on('data', function (data) {

            data.toString().split('\n').forEach(function (line) {
              if(line.replace(' ', '').length)
                processLogger.error(line)
              logger.warn('[%s] %s', name, line)
            })

          })

          child.on('exit', function () {

            var config = instances[name]

            if(lib.options(name).respawn === false) {
              processLogger.info('process exited')
              return
            }

            processLogger.warn('%s: process died!', name)

            if(lib.options(name).timeout) {
              return
            }

            processLogger.info('%s: respawing process', name)

            lib.options(name).timeout = setTimeout(function () {

              lib.options(name).timeout = null
              lib.options(name).respawn = lib.options(name).respawn || new Date

              lib.options(name).counter = lib.options(name).counter ? lib.options(name).counter : 0
              lib.options(name).counter++

              var _reset = function () {
                instances[name] = processes[name] = null
              }

              // if counter > 10 && last respawn was < 5 sec, abort
              var lastRespawn = (new Date().getTime() - lib.options(name).respawn.getTime())
              if(lib.options(name).counter > 10 && lastRespawn < 5000) {
                processLogger.warn('Respawaning failed too many times, aborted. See logs for details')
                _reset()
                options[name] = null
                return
              }

              // more than 5 min, reset counter
              var fiveMin = 5 * 60 * 1000
              if(lastRespawn > fiveMin) {
                lib.options(name).counter = 0
              }

              lib.options(name).respawn = new Date

              _reset()
              lib.prepareConfig(name, config, {
                reset: true
              }).then(lib.start)

              logger.info('Restarted')
              processLogger.info('Restarted')

            }, 1500)

          })

          return lib.persist().finally(function () {
            lib.watchRedStartup(_redStatus, ok, ko)
          })

        } catch(e) {
          return ko(e)
        }

      })
    })
}

lib.watchRedStartup = function (status, ok, ko) {
  return util.watchRedStartup(status, function () {
    ok(lib.config(status.name))
  }, ko)
}

/**
 * Check if an instance configuration exists
 *
 * @param {string} name instance name
 * @return {boolean}
 */
lib.exists = function (name) {
  return lib.config(name) !== null
}


/**
 * Creates a new instance
 *
 * @param {string} name instance name
 * @param {object} config instance configurations
 *
 * @return {Promise}
 */
lib.create = function (name, config) {
  return lib.prepareConfig(name, config, {
    reset: true
  })
    .then(function (icfg) {
      instances[name] = icfg
      return Promise.resolve(icfg)
    })
}

/**
 * Load an instance, creating it if not already available
 *
 * @param {string} name instance name
 * @param {object} config instance configurations
 *
 * @return {Promise}
 */
lib.load = function (name, config) {

  return new Promise(function (ok, ko) {

    if(typeof name === 'object') {
      config = name
      name = config.name
    }

    config = config || {}
    name = name || [(new Date).getTime(), Math.random((new Date).getTime())].join('')

    try {

      if(!instances[name]) {
        logger.info('New instance for %s', name)
        return lib.create(name, config).then(ok).catch(ko)
      }

      logger.silly('%s already exists', name)
      ok(lib.config(name))
    } catch(e) {
      ko(e)
    }

  })
}

/**
 * Store instances configurations
 *
 * @return {Promise}
 */
lib.persist = function () {
  return require('../storage').writeCache(lib.getInstances())
}

/**
 * Reload previous instances based on stored configurations
 *
 * @return {Promise}
 */
lib.reload = function () {

  var storage = require('../storage')
  return storage.readCache().then(function (raw) {

    var cachedInstances = JSON.parse(raw)
    var _keys = Object.keys(cachedInstances) || []

    if(!_keys || !_keys.length) {
      return Promise.resolve()
    }

    return Promise.all(_keys).each(function (uid) {
      var instance = cachedInstances[uid]
      logger.info('Reloading previous instance %s', instance.name)
      return lib.load(instance.name, instance).then(function (config) {
        logger.debug('Ensuring `%s` state', config.status)
        return(config.status === util.state.started) ? lib.start(config) : Promise.resolve(config)
      })
    })

  }).catch(function (e) {

    if(!(e instanceof storage.FileNotFoundError)) {
      logger.error(e)
      logger.warn('Cannot reload previous state')
    }

    return Promise.resolve()
  })
}

/**
 * Remove an instance and kill its process
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.remove = function (name) {
  return new Promise(function (ok, ko) {
    logger.info('Removing instance for %s', name)
    try {

      if(!instances[name]) {
        return ok()
      }

      var instanceDir = _config.getInstanceDir(instances[name].uid)
      logger.info('Removing %s', instanceDir)
      fs.remove(instanceDir, function () {
        delete instances[name]
        lib.persist().then(ok).catch(ko)
      })

    } catch(e) {
      logger.error('Error removing instance %s: %s', name, e.message)
      logger.error(e)
      ko(e)
    }
  })
}


lib.stop = function (name, opts) {

  opts = opts || {
    remove: false
  }

  lib.options(name).respawn = false

  var _complete = function (_name) {
  }

  if(name) {
    if(processes[name]) {

      lib.options(name).respawn = false

      processes[name].kill()
      delete processes[name]

      if(opts.remove) {
        return lib.remove(_name)
      }

      return Promise.resolve()
    }
  }

  return Promise.reject(new Error('Instance not found'))
}


/**
 * Report the status of an instance
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.status = function (name) {
  return new Promise(function (ok, ko) {

    if(!lib.exists(name)) {
      return ko(new Error('Instance does not exists'))
    }

    logger.warn('@TODO: implement localhost.status')

    var json = {
      name: name,
    }

    json.status = lib.process(name) ? 'running' : 'stopped'
    json.started = lib.config(name) ? lib.config(name).created : null


    return ok(json)
  })
}
