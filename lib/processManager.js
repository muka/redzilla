
var _config = require('./config'),
    logger = require('./logger')
    ;

var lib = module.exports


var managers = {
    localhost: require('./process/localhost'),
    docker: require('./process/docker'),
}

var manager;

var getManager = function() {
    if(!manager) {
        manager = managers[ _config.config.process ];
    }
    return manager;
}

var RedInstance = function(id) {
    this.id = id
    this.config = lib.config(id)
    this.options = lib.options(id)
}

RedInstance.prototype.start = function () {
    return lib.start()
}

RedInstance.prototype.stop = function () {
    return lib.stop()
}

RedInstance.prototype.restart = function () {
    return lib.restart()
}

RedInstance.prototype.status = function () {
    return lib.status()
}

lib.RedInstance = RedInstance

lib.addType = function(name, obj) {
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
 * Return instance configuration by name
 *
 * @param {string} name instance name
 */
lib.config = function (name) {
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

lib.stop = function() {
    return getManager().stop()
}
