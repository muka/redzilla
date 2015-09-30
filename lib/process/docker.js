var Docker = require('dockerode'),
  md5 = require('md5'),
  _config = require('../config'),
  storage = require('../storage'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  logger = require('../logger'),
  path = require('path'),
  _ = require('lodash'),
  child_process = require('child_process'),
  util = require('../util');

var lib = module.exports;

var instances = {}
var options = {}
var processes = {}

var _retries = {}

var getConfig = function () {
  return _config.getProcessConfig()
}

lib.getInstances = function () {
  return instances;
}

/**
 * Setup filesystem directory and related files
 *
 * @param {string} dir container directory
 * @param {object} settings configuration object
 * @return {Promise}
 */
lib.setup = function (config) {
  var instanceDir = _config.getInstanceDir(config.uid)
  return util.exists(instanceDir).then(function (yes) {
      if(yes) return Promise.resolve()
      logger.silly("Create user directory %s", instanceDir)
      return util.mkdir(instanceDir, 0777)
    })
    .then(function() {
      var flowFile = util.getFlowFilePath(config)
      return util.exists(flowFile).then(function (yes) {
        if(yes) return Promise.resolve()
        logger.silly("Create empty flow file at %s", flowFile)
        return storage.writeFlowFile(flowFile, "[]")
      })
    })
    .then(function () {
      return storage.writeSettingsFile(config)
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
      return ko(new Error("Instance not found"))
    }

    var config = lib.config(name)
    var userDir = path.resolve(_config.getInstanceDir(config.uid))

    var logDir = path.resolve(userDir + '/red.log')
    logger.debug("Opening log stream %s", logDir)

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
lib.instance = lib.config = function (name) {
  return instances[name];
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
  return options[name];
}

/**
 * Return instance sub-process by name
 *
 * @param {string} name instance name
 */
lib.process = function (name) {
  return processes[name];
}

/**
 * Starts a new instance based on provided configurations
 *
 * @param {object} config instance configurations
 * @return {Promise}
 */
lib.start = function (config) {

  if(typeof config === 'string') {
    config = lib.instance(config)
  }

  var name = config.name;
  instances[name] = config;

  var tryRelaunch = function (err) {

    _retries[name] = _retries[name] || { count: -1, timer: null }

    var max = 3
    var iretry = _retries[name]

    iretry.count++

    logger.info("Restarting instance %s (%s/%s)", name, iretry.count, max)
    return lib.stop(name)
      .then(function() {
        return lib.prepareConfig(name, config, {
            reset: true
          })
      })
      .then(lib.start)
      .catch(function(e) {

        logger.warn("Restart %s failed at try %s: %s", name, iretry.count, e.message)

        if(iretry.timer) {
          logger.silly("Restart timer exists for %s", name)
        }

        if( iretry.count >= max ) {

          logger.error("Failed to restart %s", name)
          iretry.count = -1
          iretry.timer && clearTimeout(iretry.timer)
          iretry.timer = null

          return
        }

        iretry.timer = setTimeout(function() {
          tryRelaunch(null)
        }, 1500)

      })
  }

  return lib.setup(config)
    .catch(function (e) {
      logger.error("Setup error: %s", e.message)
      logger.error(e)
      return Promise.reject(e)
    })
    .then(function () {
      return new Promise(function (ok, ko) {

        logger.info("Process info", instances[name])

        try {

          logger.debug("Connecting to docker socket " + getConfig().socketPath)
          var docker = new Docker({
            socketPath: getConfig().socketPath
          })

          var volumes = {}

          var userDir = path.resolve(_config.getInstanceDir(config.uid))
          var nodesDir = path.resolve(_config.getNodesDir())

          var mountPoints = {
            userDir: userDir,
            nodesDir: nodesDir, // @TODO review this!
            // flowFile: path.resolve(userDir + "/flow.json"),
            settingsFile: path.resolve(userDir + "/settings.js")
          }

          logger.debug("Mount points:")
          logger.debug(mountPoints)

          var _binds = [];

          Object.keys(getConfig().volumes).forEach(function (_key) {
            volumes[getConfig().volumes[_key]] = {}
            _binds.push(
              [mountPoints[_key], getConfig().volumes[_key]].join(':')
            )
          })

          var processLogger = logger.instance(name)

          logger.debug("Starting `" + name + "`")
          processLogger.debug("Creating container, image " + getConfig().image)

          docker.createContainer({
            Image: getConfig().image,
            Cmd: ['node', 'red', '-v'],
            Volumes: volumes,
            ExposedPorts: {
              "1880/tcp": {},
              "1880/udp": {}
            }
          }, function (err, container) {

            if(err) {
              logger.error("Error creating container: %s", err.message)
              tryRelaunch(err)
              return ko(err)
            }

            processLogger.debug("Attaching container")

            container.attach({
              stream: true,
              stdout: true,
              stderr: true,
              tty: true
            }, function (err, stream) {

              if(err) {
                logger.error("Error attaching to container: ", err.message)
                tryRelaunch(err)
                return ko(err)
              }

              var _redStatus = {
                name: name,
                redStarted: false
              }

              stream.on('data', function (raw) {

                var rawtext = raw.toString('utf-8')

                rawtext.split("\n").forEach(function (line) {

                  line = line.replace(/[^A-Za-z0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '')
                  line = line.replace('[ ]+', ' ')
                  if(line.length > 1)
                    processLogger.debug(line)
                })

                var line = rawtext.replace("\n", "")
                if(line.match(/.*Started flows.*/i)) {
                  _redStatus.redStarted = true;
                }

              })

              processLogger.debug("Volume binding:")
              processLogger.debug(_binds)

              container.start({
                Binds: _binds,
                PortBindings: {
                  "1880/tcp": [
                    {
                      "HostPort": config.port.toString()
                    }
                  ],
                  "1880/udp": [
                    {
                      "HostPort": config.port.toString()
                    }
                  ]
                },
              }, function (err, data) {

                if(err) {
                  logger.error("Error starting container: ", err.message)
                  tryRelaunch(err)
                  return ko(err)
                }

                processes[name] = container;

                processLogger.debug("Done!")
                processLogger.debug(data.toString())

                return lib.persist().finally(function () {
                  logger.debug("Instance setup done, waiting for node-red startup")
                  lib.watchRedStartup(_redStatus, ok, ko)
                })

              })
            })
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

lib.prepareConfig = function (name, iconf, opts) {
  return util.prepareConfig(name, iconf, opts).then(function (conf) {

    conf.dir = conf.settings.userDir = getConfig().volumes.userDir
    conf.settings.nodesDir = getConfig().volumes.nodesDir

    // conf.dir = conf.settings.userDir = _config.get('userDir') + '/' + conf
    // conf.settings.nodesDir = _config.get('nodesDir')

    logger.debug(JSON.stringify(conf))

    return Promise.resolve(conf)
  })
}

/**
 * Setup and start a new instance
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
 * Check if an instance configuration exists
 *
 * @param {string} name instance name
 * @return {boolean}
 */
lib.exists = function (name) {
  return lib.config(name) !== null;
}

/**
 * Get instance status
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.status = function (name) {
  return new Promise(function (ok, ko) {

    var json = {
      name: name,
      status: null
    }

    if(!lib.exists(name)) {
      return ko(new Error("Instance not found"))
    }

    if(!lib.process(name)) {
      json.status = "stopped"
      return ok(json)
    }

    lib.process(name).inspect(function (err, res) {
      if(err) return ko(err)

      var status = res.State.Running ? util.state.started : util.state.stopped
      status = res.State.Paused ? util.state.stopped : status
      status = res.State.Restarting ? util.state.restarting : status
      status = res.State.Dead ? util.state.stopped : status

      json.status = status
      json.started = (new Date(res.State.StartedAt)).toISOString()

      return ok(json)
    })

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

  if(typeof name === 'object') {
    config = name;
    name = config.name;
  }

  config = config || {}
  name = name || [(new Date).getTime(), Math.random((new Date).getTime())].join('')

  try {

    if(!instances[name]) {
      logger.info("New instance for %s", name)
      return lib.create(name, config)
    }

    logger.silly("%s already exists", name)
    return lib.prepareConfig(name, lib.config(name))
  } catch(e) {
    logger.warn("load error", e)
    return Promise.reject(e)
  }
}

/**
 * Store instances configurations
 *
 * @return {Promise}
 */
lib.persist = function () {
  return require("../storage").writeCache(lib.getInstances())
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
    var _keys = Object.keys(cachedInstances) || [];

    if(!_keys || !_keys.length) {
      return Promise.resolve()
    }

    return Promise.all(_keys).each(function (uid) {

      logger.debug("Loading uid " + uid)
      var instance = cachedInstances[uid];

      logger.info("Reloading previous instance %s", instance.name)
      return lib.load(instance.name, instance).then(function (config) {
        logger.debug("Ensuring `%s` state", config.status)
        return(config.status === util.state.started) ? lib.start(config) : Promise.resolve(config)
      })

    })

  }).catch(function (e) {

    if(!(e instanceof storage.FileNotFoundError)) {
      logger.error(e)
      logger.warn("Cannot reload previous state")
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
    logger.info("Removing instance for %s", name)
    try {
        if(!instances[name]) {
          return ok()
        }
        logger.info("Removing %s", instances[name].dir)
        fs.remove(instances[name].dir, function () {
          delete instances[name]
          lib.persist().then(ok).catch(ko)
        })
    } catch(e) {
      logger.error("Error removing instance %s: %s", name, e.message)
      ko(e)
    }
  })
}

lib.stop = function (name, opts) {

  opts = opts || {
    remove: false
  }

  var container = processes[name]

  var removeInstance = function() {
    if(opts.remove) {
      logger.debug("Destroying container for %s",  name)
      return lib.remove(name)
    }
    return Promise.resolve()
  }

  var stopContainer = function() {
    return new Promise(function (ok, ko) {
      logger.info("Stopping container %s", name)
      if(!container) return ok()
      lib.options(name).respawn = false;
      container.stop(function (err, res) {
        if(err) {
          logger.warn("Error stopping container for %s", name, err.message)
          return ko(err)
        }
        container.kill(function (err, res) {
          if(err) {
            logger.warn("Error killing container for %s", name, err.message)
            return ko(err)
          }
          delete processes[name]
          ok(res)
        })
      })
    })
  }

  logger.debug("Stopping %s",  name)
  return stopContainer().then(removeInstance)
}
