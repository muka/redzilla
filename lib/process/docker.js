var Docker = require('dockerode'),
  _config = require('../config'),
  storage = require('../storage'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  logger = require('../logger'),
  path = require('path'),
  util = require('../util')

var lib = module.exports

var instances = {}
var options = {}
var processes = {}

var _retries = {}

let containerPrefix = (name) => 'redzilla_' + name
let getContainerName = (config) => config.containerName || containerPrefix(config.name)

let getConfig = () => _config.getProcessConfig()

lib.getInstances = function () {
  return instances
}

var dockerInstance
var getDocker = function () {
  if(!dockerInstance) {
    dockerInstance = new Docker({
      socketPath: getConfig().socketPath
    })
  }
  return dockerInstance
}

let pullImage = () => {
  return new Promise(function (ok, ko) {
    var imageName = getConfig().image
    logger.debug('Fetching image %s', imageName)
    getDocker().pull(imageName, function (err, stream) {
      if(err) {
        logger.warn('Cannot fetch image %s', imageName)
        return ko(err)
      }
      let lastMessage
      stream.on('data', function (m) {
        let json = JSON.parse(m.toString())
        let currMessage = json.status
        if(lastMessage !== currMessage) {
          lastMessage = currMessage
          logger.silly('Docekr pull: %s %s', currMessage, json.id)
        }
      })
      stream.once('end', () => {
        logger.debug('Fetched image %s', imageName)
        ok()
      })
    })
  })
}

let tryRelaunch = function (config) {

  var name = config.name

  _retries[name] = _retries[name] || {
    count: 0,
    timer: null,
    lock: false
  }

  var max = 3
  var iretry = _retries[name]

  if(iretry.count === -1 || iretry.lock) {
    return Promise.reject()
  }

  iretry.lock = true

  logger.info('Restarting instance %s (%s/%s)', name, iretry.count, max)
  return lib.stop(name)
    .then(function () {
      return lib.prepareConfig(name, config, {
        reset: true
      })
    })
    .then(lib.start)
    .catch(function (e) {

      logger.warn('Restart %s failed at try %s: %s', name, (iretry.count + 1), e ? e.message : '')

      if(iretry.timer) {
        logger.silly('Restart timer exists for %s', name)
      }

      if(iretry.count >= max) {

        logger.error('Failed to restart %s', name)
        iretry.count = -1
        iretry.timer && clearTimeout(iretry.timer)
        iretry.timer = null

        return Promise.reject(new Error('Failed to restart ' + name + ', too many retries'))
      }

      if(iretry.count === -1) {
        logger.silly('Restart failed, won\'t retry again for %s', name)
        return Promise.reject(new Error('Failed to restart ' + name))
      }

      return new Promise((ok, ko) => {
        iretry.timer = setTimeout(function () {
          tryRelaunch(config).then(ok).catch(ko)
        }, 1500)
      })
    })
    .finally(() => {
      iretry.count++
      iretry.lock = false
    })
}

// https://docs.docker.com/engine/api/v1.26/#operation/ContainerCreate
let createContainer = (config) => {
  return new Promise((ok1, ko1) => {
    let name = config.name
    var processLogger = logger.instance(name)

    let containerName = getContainerName(config)

    processLogger.debug('Creating container `%s`, image %s',containerName,getConfig().image)

    config.containerName = containerName

    var volumes = {}

    var userDir = path.resolve(_config.getInstanceDir(config.uid))
    var nodesDir = path.resolve(_config.getNodesDir())

    var containerMountpoints = {
      userDir: '/user',
      nodesDir: '/nodes',
      settingsFile: '/settings.js',
    }

    var localMountpoints = {
      userDir: userDir,
      nodesDir: nodesDir, // @TODO review this!
      // flowFile: path.resolve(userDir + "/flow.json"),
      settingsFile: path.resolve(path.join(userDir, 'settings.js'))
    }

    logger.debug('Mount points', localMountpoints)

    var _binds = []

    Object.keys(getConfig().volumes).forEach(function (_key) {
      volumes[getConfig().volumes[_key]] = {}
      _binds.push([
        localMountpoints[_key],
        getConfig().volumes[_key]
      ].join(':'))
    })

    var createOptions = {
      Image: getConfig().image,
      Volumes: volumes,
      Cmd: ['node', 'red', '-v', '--settings', containerMountpoints.settingsFile, '--userDir', containerMountpoints.userDir],
      name: containerName,
      Tty: true,
      PublishAllPorts: true,
      AutoRemove: true,
      NetworkMode: 'bridge',
      LogConfig: {
        Type: 'json-file',
        Config: { }
      },
      // ExposedPorts: {
      //   '1880/tcp': {},
      //   '1880/udp': {}
      // },
      HostConfig: {
        Memory: (getConfig().memoryLimit || 0) * 1024 * 1024,
        Binds: _binds,
        // PortBindings: {
        //   '1880/tcp': [
        //     {
        //       'HostPort': config.port.toString()
        //     }
        //   ],
        //   '1880/udp': [
        //     {
        //       'HostPort': config.port.toString()
        //     }
        //   ]
        // },
      },
      NetworkingConfig : {
        EndpointsConfig: {
          redzilla: {
            IPAMConfig: {
              IPv4Address: '172.20.30.2',
              IPv6Address: '2001:db8:abcd::3033',
              LinkLocalIPs: []
            },
            Links: [
              'container_1',
              'container_2'
            ],
            Aliases: [
              'server_x',
              'server_y'
            ]
          }
        }
      }
    }
    logger.silly('docker create options: %j', createOptions)
    getDocker().createContainer(createOptions, function (err, container) {

      if(err) {
        logger.error('Error creating container (%s) %s', err.statusCode, err.json)
        return tryRelaunch(config).then(ok1).catch(ko1)
      }

      ok1(container)
    })
  })
} // createContainer()

let getContainer = (config, options) => {
  options = options || { createIfNotExists: true }
  return new Promise((ok1, ko1) => {
    let containerName = getContainerName(config)
    let container = getDocker().getContainer(containerName)
    container.inspect(function (err, data) {
      if(err) {
        if(err.statusCode === 404) {
          return options.createIfNotExists ?
                        createContainer(config).then(ok1).catch(ko1) :
                        ok1(null)

        }
        return ko1(err)
      }
      logger.debug('Container `%s` exists', containerName)
      // stop if running
      if(data.Running) {
        logger.debug('Stopping container `%s`', containerName)
        container.stop((err) => {
          if(err) {
            logger.warn('Failed to stop container `%s` %s', containerName, err.json)
            ko1(err)
            return
          }
          logger.silly('Stopped container `%s`', containerName)
          ok1(container)
        })
        return
      }

      ok1(container)
    })
  })
} // getContainer()

let attachContainer = (status, config, container) => {
  return new Promise(function(ok, ko) {
    let processLogger = logger.instance(config.name)
    processLogger.debug('Attaching container')
    container.attach({
      stream: true,
      stdout: true,
      stderr: true,
      tty: true
    }, function (err, stream) {

      if(err) {
        logger.error('Error attaching to container: %s', err.json)
        return tryRelaunch(config).then(ok).catch(ko)
      }

      stream.on('data', function (raw) {

        var rawtext = raw.toString('utf-8')

        rawtext.split('\n').forEach(function (line) {

          line = line.replace(/[^A-Za-z0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '')
          line = line.replace('[ ]+', ' ')
          if(line.length > 1)
            processLogger.debug(line)
        })

        var line = rawtext.replace('\n', '')
        if(line.match(/.*Started flows.*/i)) {
          status.redStarted = true
        }

      })

      ok(container)
    })
  })
}

let startContainer = (config) => {

  let name = config.name
  let status = {
    name: name,
    redStarted: false
  }

  return getContainer(config)
    .then((container) => {
      return attachContainer(status, config, container)
        .then(() => {
          return new Promise(function(ok, ko) {

            let processLogger = logger.instance(config.name)
            processLogger.debug('Attaching container')

            var startOptions = {}
            container.start(startOptions, function (err, data) {

              if(err) {
                logger.error('Error starting container (%s) %s', err.statusCode, err.json.message)
                return tryRelaunch(config).then(ok).catch(ko)
              }

              processes[name] = container

              processLogger.debug('Done!')
              processLogger.debug(data.toString())

              return lib.persist().finally(function () {
                logger.debug('Instance setup done, waiting for node-red startup')
                lib.watchRedStartup(status, ok, ko)
              })
            })
          })
        })
    })

} // startContainer()

/**
 * Initialize the docker based processManager
 * @return {Promise}
 */
lib.initialize = () => {
  return pullImage()
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
    logger.silly('Create user directory %s', instanceDir)
    return util.mkdir(instanceDir, 511) // 0777 => 511
  })
    .then(function () {
      var flowFile = util.getFlowFilePath(config)
      return util.exists(flowFile).then(function (yes) {
        if(yes) return Promise.resolve()
        logger.silly('Create empty flow file at %s', flowFile)
        return storage.writeFlowFile(config, '[]')
      })
    })
    // @todo: reload list of container from docker engine, match by ID / name
    .then(() => {
      return getContainer(config, { createIfNotExists: false })
          .then(function(container) {
            if (container !== null) {
              processes[config.name] = container
            }
          })
    })
    .then(() => {
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
lib.instance = lib.config = function (name) {
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
        return getContainer(config)
              .then(() => startContainer(config))
              .catch(ko)

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
  return lib.config(name) !== null
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
      return ko(new Error('Instance not found'))
    }

    if(!lib.process(name)) {
      json.status = 'stopped'
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
    config = name
    name = config.name
  }

  config = config || {}
  name = name || [(new Date).getTime(), Math.random((new Date).getTime())].join('')

  try {

    if(!instances[name]) {
      logger.info('New instance for %s', name)
      return lib.create(name, config)
    }

    logger.silly('%s already exists', name)
    return lib.prepareConfig(name, lib.config(name))
  } catch(e) {
    logger.warn('load error', e)
    return Promise.reject(e)
  }
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

      logger.debug('Loading uid ' + uid)
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
      logger.info('Removing %s', instances[name].dir)
      fs.remove(instances[name].dir, function () {
        delete instances[name]
        lib.persist().then(ok).catch(ko)
      })
    } catch(e) {
      logger.error('Error removing instance %s: %s', name, e.message)
      ko(e)
    }
  })
}

lib.stop = function (name, opts) {

  opts = opts || {
    remove: false
  }

  var container = processes[name]

  var removeInstance = function () {
    if(opts.remove) {
      logger.debug('Destroying container for %s', name)
      return lib.remove(name)
    }
    return Promise.resolve()
  }

  var stopContainer = function () {
    return new Promise(function (ok, ko) {
      logger.info('Stopping container %s', name)
      if(!container) return ok()
      lib.options(name).respawn = false
      container.stop(function (err) {
        if(err) {
          logger.warn('Error stopping container for %s', name, err.message)
          return ko(err)
        }
        container.kill(function (err, res) {
          if(err) {
            logger.warn('Error killing container for %s', name, err.message)
            return ko(err)
          }
          delete processes[name]
          ok(res)
        })
      })
    })
  }

  logger.debug('Stopping %s', name)
  return stopContainer().then(removeInstance)
}
