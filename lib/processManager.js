var _config = require('./config'),
  Promise = require('bluebird'),
  logger = require('./logger'),
  util = require('./util')

var lib = module.exports


var managers = {
  localhost: require('./process/localhost'),
  docker: require('./process/docker'),
}

var manager

var getManager = function () {

  if(!manager) {
    manager = managers[_config.config.process]
  }

  if(!manager) {
    throw new Error("Process manager not available")
  }

  return manager
}

var RedInstance = function (name) {
  this.name = name
  this.config = lib.config(this.name)
}

RedInstance.prototype.start = function () {
  var me = this
  return this.status().then(function(info) {
    if(info.status !== util.state.started) {
      me.config.status = util.state.started
      return lib.start(me.config)
    }
    return Promise.resolve(this.config)
  })
}

RedInstance.prototype.stop = function () {
  var me = this
  return this.status().then(function(info) {
    if(info.status !== util.state.stopped) {
      me.config.status = util.state.stopped
      return lib.stop(me.name)
    }
    return Promise.resolve(this.config)
  })
}

RedInstance.prototype.restart = function () {
  return this.stop().then(this.start.bind(this))
}

RedInstance.prototype.status = function () {
  return lib.status(this.name)
}

RedInstance.prototype.remove = function (opts) {
  return lib.remove(this.name, opts)
}

RedInstance.prototype.logs = function (opts) {
  return lib.logs(this.name)
}

lib.RedInstance = RedInstance

lib.addType = function (name, obj) {
  managers[name, obj];
}

lib.getInstances = function () {
  return getManager().getInstances();
}

/**
 * Setup filesystem directory and related files
 *
 * @param {string} dir container directory
 * @param {object} settings configuration object
 *
 */
lib.setup = function (dir, settings) {
  return getManager().setup(dir, settings)
}

/**
 * Return a reference to a log
 *
 * @param {string} name instance name
 * @return {Promise}
 *
 */
lib.logs = function (name) {
  return getManager().logs(name)
}

/**
 * Return instance configuration by name
 *
 * @param {string} name instance name
 */
lib.instance = lib.config = function (name) {
  return getManager().config(name);
}

/**
 * Return instance runtime options by name
 *
 * @param {string} name instance name
 */
lib.options = function (name) {
  return getManager().options(name)
}

/**
 * Return instance sub-process by name
 *
 * @param {string} name instance name
 */
lib.process = function (name) {
  return getManager().process(name)
}

/**
 * Starts a new instance based on provided configurations
 *
 * @param {object} config instance configurations
 * @return {Promise}
 */
lib.start = function (config) {
  return getManager().start(config);
}

/**
 * Check if an instance configuration exists
 *
 * @param {string} name instance name
 * @return {boolean}
 */
lib.exists = function (name) {
  return getManager().exists(name)
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
  return getManager().create(name, config)
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
  return getManager().load(name, config)
}

/**
 * Store instances configurations
 *
 * @return {Promise}
 */
lib.persist = function () {
  return getManager().persist()
}

/**
 * Reload previous instances based on stored configurations
 *
 * @return {Promise}
 */
lib.reload = function () {
  return getManager().reload()
}

/**
 * Kill an instance process
 *
 * @param {string} name instance name
 * @return {boolean} operation result
 */
lib.kill = function (name) {
  return getManager().kill(name)
}

/**
 * Return instance status informations
 *
 * @param {string} name instance name
 * @return {Promise} Promise of result
 */
lib.status = function (name) {
  return getManager().status(name)
}

/**
 * Remove an instance and kill its process
 *
 * @param {string} name instance name
 * @return {Promise}
 */
lib.remove = function (name) {
  return getManager().remove(name)
}

lib.stop = function (name) {
  return getManager().stop(name)
}

lib.restart = function (name) {
  return(new RedInstance(name)).restart()
}

lib.stopAll = function () {
  var list = lib.getInstances()
  return Promise.all(Object.keys(list)).each(function (name) {
    return lib.stop(name)
  })
}
