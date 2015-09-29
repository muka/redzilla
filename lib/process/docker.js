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
  return util.exists(config.dir).then(function (yes) {
      if(yes) return Promise.resolve()
      return util.mkdir(config.dir, 0777)
    })
    .then(function () {
      var flowFile = util.getFlowFilePath(config)
      return util.exists(flowFile).then(function (yes) {
        if(yes) return Promise.resolve()
        return storage.writeFlowFile(config, "[]")
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

    logStream.on('open', function() {
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

  var name = config.name;
  instances[name] = config;

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
          var docker = new Docker({ socketPath: getConfig().socketPath })

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
              logger.error("Error creating container!")
              logger.error(err)
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
                logger.error("Error attaching to container!")
                logger.error(err)
                return ko(err)
              }

              var _redStatus = {
                name: name,
                redStarted: false
              }

              stream.on('data', function (raw) {

                var rawtext = raw.toString('utf-8')

                rawtext.split("\n").forEach(function(line) {

                  line = line.replace(/[^A-Za-z0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '')
                  line= line.replace('[ ]+', ' ')
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
                    {"HostPort": config.port.toString()}
                  ],
                  "1880/udp": [
                    {"HostPort": config.port.toString()}
                  ]
                },
              }, function (err, data) {

                if(err) {
                  logger.error("Error starting container!")
                  logger.error(err)
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
  return lib.prepareConfig(name, config, { reset: true })
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
      return lib.load(instance.name, instance).then(function(config) {
        logger.debug("Ensuring `%s` state", config.status)
        return (config.status === util.state.started)
            ? lib.start(config) : Promise.resolve(config)
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
 * Kill an instance process
 *
 * @param {string} name instance name
 * @return {boolean} operation result
 */
lib.kill = function (name) {
  return new Promise(function (ok, ko) {

    logger.info("Stopping container %s", name)

    if(processes[name]) {

      lib.options(name).respawn = false;

      processes[name].stop(function (err, res) {

        if(err) {
          logger.warn("Error killing " + name)
          return ko(err)
        }

        delete processes[name];
        ok(res)
      })

    } else return ok()

  })
}

/**
 * Destroy a container
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.destroy = function (name) {
  return new Promise(function (ok, ko) {

    try {

      var container = instances[name];
      if(container) {

        logger.info("Destroy instance %s", name)
        container.remove(function (err, res) {

          if(err) {
            logger.error(err)
            return ko(err)
          }

          logger.info("Ok")
          ok()
        })

      } else return ok()

    } catch(e) {

      logger.error(e)
      ko(e)
    }

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

      lib.stop(name).then(function () {

        if(instances[name]) {

          logger.info("Removing %s", instances[name].dir)
          fs.remove(instances[name].dir, function () {

            logger.info("Ok")
            delete instances[name];

            lib.persist().then(ok).catch(ko)
          })

        } else return ok()

      }).catch(ko)
    } catch(e) {

      logger.error(e)
      ko(e)
    }

  })
}

lib.stop = function (name, opts) {

  opts = opts || {
    destroy: true
  }

  var _complete = function (_name, container) {

    if(container && opts.destroy) {
      logger.debug("Destroying container for " + _name)
      return lib.destroy(container.name)
    }

    return Promise.resolve()
  }

  var stopInstance = function (_name) {
    logger.debug("Stopping " + _name)
    var _container = processes[_name];
    return lib.kill(_name).then(function () {
      return _complete(_name, _container)
    })
  }

  if(name) {
    return stopInstance(name)
  }

  var _k = Object.keys(processes)
  logger.debug("Stopping %s instances", _k.length)
  return Promise.all(_k).each(stopInstance)
}
